import { useMutation, useQueryClient } from "@tanstack/react-query";
import { apiFetch } from "@/lib/api/client";
import { useAuthStore } from "@/store/auth-store";
import type { User } from "@/types/user";

export function useSetUnverifiedPhone() {
  const queryClient = useQueryClient();
  const setProfile = useAuthStore((s) => s.setProfile);

  return useMutation({
    mutationFn: (phone: string) =>
      apiFetch<User>("/api/users/me/phone", { method: "PATCH", body: JSON.stringify({ phone }) }),
    onSuccess: (updated) => {
      setProfile(updated);
      queryClient.setQueryData(["me", updated.firebaseUid], updated);
    },
  });
}