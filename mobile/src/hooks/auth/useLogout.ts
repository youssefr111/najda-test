import { useQueryClient } from "@tanstack/react-query";
import { signOut } from "firebase/auth";
import { firebaseAuth } from "@/firebase/client";
import { useAuthStore } from "@/store/auth-store";

export function useLogout() {
  const queryClient = useQueryClient();
  const reset = useAuthStore((s) => s.reset);

  return async function logout() {
    await signOut(firebaseAuth).catch(() => null);
    reset();
    queryClient.removeQueries({ queryKey: ["me"] });
    queryClient.clear();
    // No manual navigation here -- the root layout already redirects to
    // /login the moment `status` flips to "unauthenticated".
  };
}
