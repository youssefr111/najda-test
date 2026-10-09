import { firebaseAuth } from "@/lib/firebase/client";

const API_BASE_URL = process.env.NEXT_PUBLIC_API_BASE_URL;

export class ApiError extends Error {
  status: number;
  constructor(message: string, status: number) {
    super(message);
    this.status = status;
  }
}

/**
 * Calls your Spring Boot services directly from the browser, authenticated
 * with a fresh Firebase ID token (not the Next.js session cookie — that
 * cookie never leaves this app). `getIdToken()` transparently refreshes
 * the token if it's within ~5 minutes of expiry, so the role claim it
 * carries stays reasonably current without you managing that manually.
 */
export async function apiFetch<T>(path: string, init: RequestInit = {}): Promise<T> {
  const user = firebaseAuth.currentUser;
  const token = user ? await user.getIdToken() : null;

  const isFormData = init.body instanceof FormData;

  const response = await fetch(`${API_BASE_URL}${path}`, {
    ...init,
    headers: {
      ...(isFormData ? {} : { "Content-Type": "application/json" }),
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...init.headers,
    },
  });

  if (!response.ok) {
    const body = await response.json().catch(() => null);
    throw new ApiError(body?.error ?? body?.message ?? `Request failed with ${response.status}`, response.status);
  }

  // Covers every empty-body success shape, not just 204 -- ResponseEntity.ok().build()
  // (200, no body) is common across these controllers too, and .json() on an
  // empty string throws regardless of status code. Reading as text first and
  // only parsing when something's actually there is what the 204-only check missed.
  const text = await response.text();
  return (text ? JSON.parse(text) : undefined) as T;
}