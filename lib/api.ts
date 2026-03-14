import { useCallback, useRef } from "react";
import { useAuth } from "@clerk/expo";

const API_URL = process.env.EXPO_PUBLIC_API_URL || "https://coconut-lemon.vercel.app";
const SKIP_AUTH = process.env.EXPO_PUBLIC_SKIP_AUTH === "true";

function unauthResponse() {
  return new Response(JSON.stringify({ error: "Unauthorized" }), {
    status: 401,
    headers: { "Content-Type": "application/json", "X-Coconut-Auth": "signed-out" },
  });
}

/** Clerk has a race: getToken() can return null or throw (e.g. clerk_offline). Retry generously. */
async function getTokenWithRetry(
  getToken: (opts?: { skipCache?: boolean }) => Promise<string | null>,
  maxAttempts = 14
): Promise<string | null> {
  for (let i = 0; i < maxAttempts; i++) {
    try {
      const token = await getToken({ skipCache: i > 0 });
      if (token) return token;
    } catch (e) {
      const msg = (e as { message?: string })?.message ?? "";
      const isOffline = /offline|network|clerk_offline|disconnected/i.test(msg);
      if (isOffline && i < maxAttempts - 1) {
        await new Promise((r) => setTimeout(r, 600 + 300 * i));
        continue;
      }
      console.warn("[api] getToken error:", msg);
    }
    if (i < maxAttempts - 1) {
      await new Promise((r) => setTimeout(r, 400 + 200 * i));
    }
  }
  return null;
}

export function useApiFetch() {
  const { getToken, isLoaded, isSignedIn } = useAuth();
  const ref = useRef({ getToken, isLoaded, isSignedIn });
  ref.current = { getToken, isLoaded, isSignedIn };

  return useCallback(
    async (
      path: string,
      opts: Omit<RequestInit, "body"> & { body?: object | FormData } = {}
    ) => {
      // SKIP_AUTH: never wait for token, return 401 so UI shows Connect state immediately
      if (SKIP_AUTH) return unauthResponse();

      const { isLoaded: loaded, isSignedIn: signedIn, getToken: gt } = ref.current;
      if (loaded && !signedIn) return unauthResponse();

      const token = await getTokenWithRetry(gt);
      if (!token) {
        if (loaded && !signedIn) return unauthResponse();
        // Token race window: don't hit backend unauthenticated.
        return new Response(
          JSON.stringify({ error: "Session token unavailable" }),
          {
            status: 425,
            headers: {
              "Content-Type": "application/json",
              "X-Coconut-Auth": "token-missing",
            },
          }
        );
      }

      const headers: Record<string, string> = {
        ...(opts.headers as Record<string, string>),
      };
      headers["Authorization"] = `Bearer ${token}`;
      if (
        opts.body &&
        typeof opts.body === "object" &&
        !(opts.body instanceof FormData)
      ) {
        headers["Content-Type"] = "application/json";
      }
      const url = `${API_URL.replace(/\/$/, "")}${path.startsWith("/") ? path : `/${path}`}`;
      let body: FormData | string | undefined;
      if (opts.body instanceof FormData) {
        body = opts.body;
      } else if (opts.body && typeof opts.body === "object" && !("uri" in opts.body)) {
        body = JSON.stringify(opts.body);
      } else {
        body = undefined;
      }

      const logInput = () => {
        const safeBody =
          opts.body && typeof opts.body === "object" && !(opts.body instanceof FormData)
            ? JSON.stringify(opts.body)
            : opts.body instanceof FormData
              ? "[FormData]"
              : undefined;
        console.log(`[api] → ${(opts.method ?? "GET").toUpperCase()} ${path}`, safeBody ? { body: safeBody } : "");
      };
      logInput();

      let response: Response;
      try {
        response = await fetch(url, { ...opts, headers, body });
      } catch (e) {
        const msg = (e instanceof Error ? e.message : String(e)) || "Network request failed";
        console.warn(`[api] fetch failed: ${path}`, msg);
        return new Response(
          JSON.stringify({ error: "Network request failed. Check your connection and retry." }),
          { status: 503, statusText: msg, headers: { "Content-Type": "application/json" } }
        );
      }

      let responseText: string;
      try {
        responseText = await response.text();
      } catch (e) {
        const msg = (e instanceof Error ? e.message : String(e)) || "Failed to read response";
        console.warn(`[api] response read failed: ${path}`, msg);
        return new Response(
          JSON.stringify({ error: "Network request failed. Check your connection and retry." }),
          { status: 503, statusText: msg, headers: { "Content-Type": "application/json" } }
        );
      }

      const output = responseText.length > 500 ? `${responseText.slice(0, 500)}…` : responseText;
      let parsed: unknown = output;
      if (output && (output.startsWith("{") || output.startsWith("["))) {
        try {
          parsed = JSON.parse(output);
        } catch {
          parsed = output;
        }
      }
      console.log(`[api] ← ${path} ${response.status}`, output ? parsed : "");

      return new Response(responseText, {
        status: response.status,
        statusText: response.statusText,
        headers: response.headers,
      });
    },
    []
  );
}

export function getApiUrl() {
  return API_URL;
}
