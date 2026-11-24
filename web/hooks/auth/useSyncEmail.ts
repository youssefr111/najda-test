import { useMutation, useQueryClient } from "@tanstack/react-query";
import { firebaseAuth } from "@/lib/firebase/client";
import { apiFetch } from "@/lib/api/client";
import { useAuthStore } from "@/store/auth-store";
import type { User } from "@/types/user";

export function useSyncEmail() {
  const queryClient = useQueryClient();
  const setProfile = useAuthStore((s) => s.setProfile);

  return useMutation({
    mutationFn: async () => {
      // Force refresh first -- the whole point is picking up whatever
      // Firebase's email now is, post-confirmation-link-click.
      await firebaseAuth.currentUser?.getIdToken(true);
      return apiFetch<User>("/api/users/me/sync-email", { method: "POST" });
    },
    onSuccess: (updated) => {
      setProfile(updated);
      queryClient.setQueryData(["me", updated.firebaseUid], updated);
    },
  });
}