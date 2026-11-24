import "server-only";
import { cookies } from "next/headers";
import { adminAuth } from "@/lib/firebase/admin";

export const SESSION_COOKIE_NAME = "session";
export const SESSION_MAX_AGE_SECONDS = 60 * 60 * 24 * 5; // 5 days

export async function createSessionCookie(idToken: string) {
  return adminAuth.createSessionCookie(idToken, {
    expiresIn: SESSION_MAX_AGE_SECONDS * 1000,
  });
}

export type SessionUser = {
  firebaseUid: string;
  email: string | null;
  role: string | null;
};

/**
 * Reads and verifies the session cookie from a Server Component or Route
 * Handler. `role` comes from the Firebase custom claim your backend sets —
 * treat it as a UX/routing hint only. The Spring services must still
 * re-derive the role from Postgres per request; never authorize a write
 * based on this value alone.
 */
export async function getServerSession(): Promise<SessionUser | null> {
  const cookieStore = await cookies();
  const session = cookieStore.get(SESSION_COOKIE_NAME)?.value;
  if (!session) return null;

  try {
    // `true` = checkRevoked, so a role change that calls revokeRefreshTokens
    // takes effect immediately instead of waiting for cookie expiry.
    const decoded = await adminAuth.verifySessionCookie(session, true);
    return {
      firebaseUid: decoded.uid,
      email: decoded.email ?? null,
      role: (decoded.role as string | undefined) ?? null,
    };
  } catch {
    return null;
  }
}
