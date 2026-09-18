import { useMutation, useQueryClient } from "@tanstack/react-query";
import { apiFetch } from "@/api/client";
import { useAuthStore } from "@/store/auth-store";
import type { Gender, User } from "@/types/user";

export type UpdateProfileRequest = {
  firstName: string;
  lastName: string;
  gender: Gender;
  address: string;
};

export function useUpdateProfile(userId: number) {
  const queryClient = useQueryClient();
  const setProfile = useAuthStore((s) => s.setProfile);

  return useMutation({
    mutationFn: (payload: UpdateProfileRequest) =>
      apiFetch<User>(`/api/users/${userId}/profile`, {
        method: "PATCH",
        body: JSON.stringify(payload),
      }),
    onSuccess: (updatedUser) => {
      setProfile(updatedUser);
      queryClient.setQueryData(["me", updatedUser.firebaseUid], updatedUser);
    },
  });
}
