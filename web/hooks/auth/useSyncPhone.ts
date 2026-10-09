import { useMutation, useQueryClient } from "@tanstack/react-query";
import { apiFetch } from "@/lib/api/client";
import { useAuthStore } from "@/store/auth-store";
import type { User } from "@/types/user";

export function useSyncPhone() {
  const queryClient = useQueryClient();
  const setProfile = useAuthStore((s) => s.setProfile);

  return useMutation({
    mutationFn: () => apiFetch<User>("/api/users/me/sync-phone", { method: "POST" }),
    onSuccess: (updated) => {
      setProfile(updated);
      queryClient.setQueryData(["me", updated.firebaseUid], updated);
    },
  });
}