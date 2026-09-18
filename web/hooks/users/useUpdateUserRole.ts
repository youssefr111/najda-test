import { useMutation, useQueryClient } from "@tanstack/react-query";
import { apiFetch } from "@/lib/api/client";
import type { User } from "@/types/user";
import type { UserRole } from "@/lib/auth/roles";

export function useUpdateUserRole() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ userId, role }: { userId: number; role: UserRole }) =>
      apiFetch<User>(`/api/users/${userId}/role`, {
        method: "PATCH",
        body: JSON.stringify(role), // -> `"ADMIN"`, matching @RequestBody String
      }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["users"] }),
  });
}