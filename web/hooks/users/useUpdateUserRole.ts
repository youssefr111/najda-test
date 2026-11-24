import { useMutation, useQueryClient } from "@tanstack/react-query";
import { apiFetch } from "@/lib/api/client";
import type { UserRole } from "@/lib/auth/roles";

export function useUpdateUserRole() {
  const queryClient = useQueryClient();
  return useMutation({
    // The endpoint answers with `{ message }`, not the edited user, so there is nothing to patch into the
    // cache: refetch the list instead. (The old code looked for `updated.id`, matched nothing, and only
    // marked the list stale without fetching -- hence the stale role until a manual refresh.)
    mutationFn: ({ userId, role }: { userId: number; role: UserRole }) =>
      apiFetch<{ message: string }>(`/api/users/${userId}/role`, {
        method: "PATCH",
        body: JSON.stringify(role), // -> `"ADMIN"`, matching @RequestBody String
      }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["users"] }),
  });
}