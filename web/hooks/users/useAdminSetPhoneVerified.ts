import { useMutation, useQueryClient } from "@tanstack/react-query";
import { apiFetch } from "@/lib/api/client";
import type { User } from "@/types/user";

/** Admin: mark someone's phone verified, or reset it to unverified, by hand (testing, support). Audited server-side. */
export function useAdminSetPhoneVerified() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ userId, verified, note }: { userId: number; verified: boolean; note?: string }) =>
      apiFetch<User>(`/api/users/${userId}/admin-phone-verification`, {
        method: "POST",
        body: JSON.stringify({ verified, note }),
      }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["users"] }),
  });
}