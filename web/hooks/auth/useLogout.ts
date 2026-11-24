import { useQueryClient } from "@tanstack/react-query";
import { signOut } from "firebase/auth";
import { firebaseAuth } from "@/lib/firebase/client";
import { useAuthStore } from "@/store/auth-store";
import { unregisterThisDevice } from "@/lib/notifications/device";

export function useLogout() {
  const queryClient = useQueryClient();
  const reset = useAuthStore((s) => s.reset);

  return async function logout() {
    // While the session is still valid: stop pushes for this user on this browser, so the next
    // person to sign in here never gets someone else's alerts. Best effort (offline is fine).
    await unregisterThisDevice({ dropToken: false }).catch(() => undefined);

    const sessionCleared = await fetch("/api/session", { method: "DELETE" })
      .then((res) => res.ok)
      .catch(() => false);

    if (!sessionCleared) {
      console.error("Failed to clear session cookie during logout.");
    }

    await signOut(firebaseAuth).catch(() => null);
    reset();

    // No manual navigation here -- AuthGuard already redirects to /login
    // the moment `status` flips to "unauthenticated" on every protected
    // page. A second, independent push()+refresh() here was racing that
    // redirect and leaving the page stuck mid-transition.
    queryClient.removeQueries({ queryKey: ["me"] });
    queryClient.clear();
  };
}