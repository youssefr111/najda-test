import { firebaseAuth } from "@/lib/firebase/client";

export async function establishSession(sessionFailedMessage: string): Promise<void> {
  const idToken = await firebaseAuth.currentUser?.getIdToken(true);
  const res = await fetch("/api/session", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ idToken }),
  });
  if (!res.ok) {
    const body = await res.json().catch(() => null);
    throw new Error(body?.error ?? sessionFailedMessage);
  }
}