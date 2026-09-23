import { firebaseAuth } from "@/firebase/client";
import { config } from "@/constants/config";
import { withTimeout } from "@/lib/withTimeout";

const DEFAULT_TIMEOUT_MS = 15_000;

export class ApiError extends Error {
  status: number;
  constructor(message: string, status: number) {
    super(message);
    this.status = status;
    this.name = "ApiError";
  }
}

/**
 * Calls the Spring Boot backend directly, authenticated with a fresh
 * Firebase ID token. There is no session cookie here (that's a Next.js-only
 * concept on the web app) — the ID token itself, refreshed transparently by
 * the SDK when it's close to expiry, is the only credential this app needs.
 *
 * Every call is bounded by a timeout, enforced two ways: AbortController
 * (cancels the real request when the platform honors it) AND withTimeout
 * (a plain Promise.race fallback that guarantees this function returns an
 * error after timeoutMs regardless -- AbortController's cancellation isn't
 * reliably honored by every React Native fetch implementation/version, so
 * relying on it alone can mean the "timeout" silently never fires).
 */
export async function apiFetch<T>(
  path: string,
  init: RequestInit = {},
  timeoutMs: number = DEFAULT_TIMEOUT_MS
): Promise<T> {
  const timeoutMessage =
    `Timed out reaching ${config.apiBaseUrl}${path} after ${timeoutMs / 1000}s. ` +
    `Check EXPO_PUBLIC_API_BASE_URL (must be your machine's LAN IP, not localhost, ` +
    `for a physical device or Expo Go) and that the backend is running and reachable.`;

  return withTimeout(runFetch<T>(path, init, timeoutMs), timeoutMs + 1000, timeoutMessage);
}

async function runFetch<T>(path: string, init: RequestInit, timeoutMs: number): Promise<T> {
  const user = firebaseAuth.currentUser;
  const token = user ? await withTimeout(user.getIdToken(), timeoutMs, "Timed out refreshing your session token.") : null;

  const isFormData = typeof FormData !== "undefined" && init.body instanceof FormData;

  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), timeoutMs);

  let response: Response;
  try {
    response = await fetch(`${config.apiBaseUrl}${path}`, {
      ...init,
      signal: init.signal ?? controller.signal,
      headers: {
        ...(isFormData ? {} : { "Content-Type": "application/json" }),
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
        ...init.headers,
      },
    });
  } catch (err) {
    if ((err as Error).name === "AbortError") {
      throw new ApiError(
        `Timed out reaching ${config.apiBaseUrl}${path} after ${timeoutMs / 1000}s. ` +
          `Check EXPO_PUBLIC_API_BASE_URL (must be your machine's LAN IP, not localhost, ` +
          `for a physical device or Expo Go) and that the backend is running and reachable.`,
        0
      );
    }
    throw new ApiError(
      err instanceof Error ? err.message : "Network request failed -- is the backend reachable from this device?",
      0
    );
  } finally {
    clearTimeout(timeoutId);
  }

  if (!response.ok) {
    const body = await response.json().catch(() => null);
    throw new ApiError(body?.error ?? body?.message ?? `Request failed with ${response.status}`, response.status);
  }

  // Covers every empty-body success shape (ResponseEntity.ok().build(), 204,
  // etc.) -- reading as text first avoids JSON.parse throwing on "".
  const text = await response.text();
  return (text ? JSON.parse(text) : undefined) as T;
}
