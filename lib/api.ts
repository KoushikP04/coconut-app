import { useCallback } from "react";
import { useAuth } from "@clerk/expo";

const API_URL = process.env.EXPO_PUBLIC_API_URL || "https://coconut-lemon.vercel.app";

/** Clerk has a race: getToken() can return null right after isSignedIn. Retry a few times. */
async function getTokenWithRetry(
  getToken: (opts?: { skipCache?: boolean }) => Promise<string | null>,
  maxAttempts = 8
): Promise<string | null> {
  for (let i = 0; i < maxAttempts; i++) {
    const token = await getToken({ skipCache: i > 0 });
    if (token) return token;
    if (i < maxAttempts - 1) {
      await new Promise((r) => setTimeout(r, 350 * (i + 1)));
    }
  }
  return null;
}

export function useApiFetch() {
  const { getToken, isLoaded, isSignedIn } = useAuth();

  return useCallback(
    async (
      path: string,
      opts: Omit<RequestInit, "body"> & { body?: object | FormData } = {}
    ) => {
      // Signed-out state: return synthetic 401 (no network request).
      if (isLoaded && !isSignedIn) {
        return new Response(
          JSON.stringify({ error: "Unauthorized" }),
          {
            status: 401,
            headers: {
              "Content-Type": "application/json",
              "X-Coconut-Auth": "signed-out",
            },
          }
        );
      }

      const token = await getTokenWithRetry(getToken);
      if (!token) {
        // If auth is fully loaded and signed out, keep status semantics consistent.
        if (isLoaded && !isSignedIn) {
          return new Response(
            JSON.stringify({ error: "Unauthorized" }),
            {
              status: 401,
              headers: {
                "Content-Type": "application/json",
                "X-Coconut-Auth": "signed-out",
              },
            }
          );
        }
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
      return fetch(url, { ...opts, headers, body });
    },
    [getToken, isLoaded, isSignedIn]
  );
}

export function getApiUrl() {
  return API_URL;
}
