import { useEffect, useMemo, useRef } from "react";
import { Stack } from "expo-router";
import { StatusBar } from "expo-status-bar";
import { ClerkProvider, useAuth, useClerk } from "@clerk/expo";
import { tokenCache } from "@clerk/expo/token-cache";
import { AuthHandoffHandler } from "../components/AuthHandoffHandler";
import { ThemeProvider, useTheme } from "../lib/theme-context";

function StatusBarFromTheme() {
  const { theme } = useTheme();
  return <StatusBar style={theme.statusBarStyle === "dark" ? "dark" : "light"} />;
}

const publishableKey = process.env.EXPO_PUBLIC_CLERK_PUBLISHABLE_KEY;

if (!publishableKey) {
  console.warn("EXPO_PUBLIC_CLERK_PUBLISHABLE_KEY not set — auth will fail");
}

const FORCE_SIGN_OUT_ON_LAUNCH = process.env.EXPO_PUBLIC_FORCE_SIGN_OUT === "true";
const SKIP_AUTH = process.env.EXPO_PUBLIC_SKIP_AUTH === "true";

function AuthSwitch() {
  const { isSignedIn, isLoaded } = useAuth();
  const { signOut } = useClerk();
  const hasClearedSession = useRef(false);
  const instance = useMemo(() => {
    if (!publishableKey) return "missing";
    const [, env, encoded = ""] = publishableKey.match(/^pk_(test|live)_(.+)$/) ?? [];
    if (!env || !encoded) return "invalid";
    return `${env}:${encoded.slice(0, 16)}...`;
  }, []);

  useEffect(() => {
    if (SKIP_AUTH) return;
    const showAuth = !isLoaded || !isSignedIn || (FORCE_SIGN_OUT_ON_LAUNCH && isSignedIn);
    console.log(`[AuthSwitch] isLoaded=${isLoaded} isSignedIn=${isSignedIn} FORCE_SIGN_OUT=${FORCE_SIGN_OUT_ON_LAUNCH} → ${showAuth ? "AUTH" : "TABS"}`);
  }, [isLoaded, isSignedIn, instance]);

  // Clear stale cached session that causes sign-in → tabs → forever-spinner loop
  useEffect(() => {
    if (SKIP_AUTH || !FORCE_SIGN_OUT_ON_LAUNCH || !isLoaded || !isSignedIn || hasClearedSession.current) return;
    console.log("[AuthSwitch] FORCE_SIGN_OUT: calling signOut()...");
    hasClearedSession.current = true;
    signOut?.()
      .then(() => console.log("[AuthSwitch] FORCE_SIGN_OUT: signOut() done"))
      .catch((e: unknown) => console.warn("[AuthSwitch] FORCE_SIGN_OUT failed:", e));
  }, [isLoaded, isSignedIn, signOut]);

  // SKIP_AUTH: always show tabs so you can see the UI without signing in
  if (SKIP_AUTH) {
    return (
      <Stack screenOptions={{ headerShown: false }}>
        <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
        <Stack.Screen name="connected" options={{ headerShown: false }} />
      </Stack>
    );
  }

  // Block tabs when: not loaded, not signed in, OR FORCE_SIGN_OUT + cached session (until signOut completes)
  if (!isLoaded || !isSignedIn || (FORCE_SIGN_OUT_ON_LAUNCH && isSignedIn)) {
    return (
      <Stack screenOptions={{ headerShown: false }}>
        <Stack.Screen name="(auth)" options={{ headerShown: false }} />
        <Stack.Screen name="auth-handoff" options={{ headerShown: false }} />
      </Stack>
    );
  }
  return (
    <Stack screenOptions={{ headerShown: false }}>
      <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
      <Stack.Screen name="connected" options={{ headerShown: false }} />
    </Stack>
  );
}

export default function RootLayout() {
  return (
    <ThemeProvider>
      <ClerkProvider
        publishableKey={publishableKey ?? ""}
        tokenCache={tokenCache}
      >
        <StatusBarFromTheme />
        <AuthHandoffHandler />
        <AuthSwitch />
      </ClerkProvider>
    </ThemeProvider>
  );
}
