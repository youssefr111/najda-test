/**
 * Firebase Auth errors carry a stable `code` (e.g. "auth/wrong-password").
 * Translating those into friendly copy lives in i18n (see
 * src/i18n/locales/*.json -> "auth.errors"); this just picks the right key
 * and falls back sensibly for everything else (our own backend errors,
 * network failures, and truly unexpected throws).
 */
const FIREBASE_ERROR_KEYS: Record<string, string> = {
  "auth/invalid-email": "auth.errors.invalidEmail",
  "auth/user-disabled": "auth.errors.userDisabled",
  "auth/user-not-found": "auth.errors.invalidCredential",
  "auth/wrong-password": "auth.errors.invalidCredential",
  "auth/invalid-credential": "auth.errors.invalidCredential",
  "auth/email-already-in-use": "auth.errors.emailAlreadyInUse",
  "auth/weak-password": "auth.errors.weakPassword",
  "auth/too-many-requests": "auth.errors.tooManyRequests",
  "auth/network-request-failed": "auth.errors.network",
  "auth/popup-closed-by-user": "auth.errors.cancelled",
  "auth/cancelled-popup-request": "auth.errors.cancelled",
};

export function resolveAuthErrorKey(err: unknown): string {
  const code = (err as { code?: string })?.code;
  if (code && FIREBASE_ERROR_KEYS[code]) return FIREBASE_ERROR_KEYS[code];
  return "auth.errors.generic";
}

export function resolveRawErrorMessage(err: unknown): string | null {
  // Errors thrown by our own backend (ApiError) or by app code carry a
  // human-readable message already -- those pass through as-is instead of
  // being forced through the Firebase-code map above.
  if (err && typeof err === "object" && "code" in err) return null;
  if (err instanceof Error) return err.message;
  return null;
}
