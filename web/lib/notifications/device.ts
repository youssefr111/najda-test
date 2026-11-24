import { apiFetch } from "@/lib/api/client";
import { deletePushToken, getPushToken } from "@/lib/firebase/messaging";

const TOKEN_KEY = "najda-push-token";
const OPT_OUT_KEY = "najda-push-off";

/** The user switched browser notifications off on this browser (an explicit choice, kept across sign-ins). */
export function isPushOptedOut(): boolean {
  return typeof window !== "undefined" && window.localStorage.getItem(OPT_OUT_KEY) === "1";
}

export function setPushOptedOut(optedOut: boolean): void {
  if (optedOut) window.localStorage.setItem(OPT_OUT_KEY, "1");
  else window.localStorage.removeItem(OPT_OUT_KEY);
}

/**
 * Registers this browser with the backend for push. Idempotent: safe on every
 * page load and when the language changes (the backend writes pushes in it).
 * Returns false when no token could be issued.
 */
export async function registerThisDevice(locale: string): Promise<boolean> {
  const token = await getPushToken();
  if (!token) return false;

  await apiFetch<void>("/api/notifications/devices", {
    method: "POST",
    body: JSON.stringify({ token, platform: "WEB", locale }),
  });
  window.localStorage.setItem(TOKEN_KEY, token);
  return true;
}

/**
 * Stops pushes to this browser for the current user.
 * `dropToken` also deletes the FCM token (push switched off); without it the token
 * is kept so the next sign-in simply registers it again (sign-out).
 */
export async function unregisterThisDevice({ dropToken }: { dropToken: boolean }): Promise<void> {
  const token = window.localStorage.getItem(TOKEN_KEY);
  if (token) {
    await apiFetch<void>(`/api/notifications/devices?token=${encodeURIComponent(token)}`, { method: "DELETE" });
    window.localStorage.removeItem(TOKEN_KEY);
  }
  if (dropToken) await deletePushToken();
}
