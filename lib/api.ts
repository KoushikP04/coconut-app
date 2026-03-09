import { useCallback } from "react";
import { useAuth } from "@clerk/expo";

const API_URL = process.env.EXPO_PUBLIC_API_URL || "https://coconut-lemon.vercel.app";

/** Clerk has a race: getToken() can return null right after isSignedIn. Retry a few times. */
async function getTokenWithRetry(
  getToken: (opts?: { skipCache?: boolean }) => Promise<string | null>,
  maxAttempts = 4
): Promise<string | null> {
  for (let i = 0; i < maxAttempts; i++) {
    const token = await getToken({ skipCache: i > 0 });
    if (token) return token;
    if (i < maxAttempts - 1) {
      await new Promise((r) => setTimeout(r, 300 * (i + 1)));
    }
  }
  return null;
}

export function useApiFetch() {
  const { getToken } = useAuth();

  return useCallback(
    async (
      path: string,
      opts: Omit<RequestInit, "body"> & { body?: object | FormData } = {}
    ) => {
      const token = await getTokenWithRetry(getToken);
      const headers: Record<string, string> = {
        ...(opts.headers as Record<string, string>),
      };
      if (token) {
        headers["Authorization"] = `Bearer ${token}`;
      }
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
    [getToken]
  );
}

export function getApiUrl() {
  return API_URL;
}
