import { useMutation, useQueryClient } from "@tanstack/react-query";
import { apiFetch } from "@/lib/api/client";
import type { User } from "@/types/user";

export function useUpdateUserFacility() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ userId, facilityId }: { userId: number; facilityId: number | null }) =>
      apiFetch<User>(`/api/users/${userId}/facility`, { method: "PATCH", body: JSON.stringify({ facilityId }) }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["users"] }),
  });
}