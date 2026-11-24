import { useMutation, useQueryClient } from "@tanstack/react-query";
import { apiFetch } from "@/lib/api/client";
import { useAuthStore } from "@/store/auth-store";
import type { User, Gender } from "@/types/user";
import type { AddressPayload } from "@/lib/address/address";

/** Mirrors the backend's CompleteProfileRequest. `phone` is omitted when a verified number is already on file. */
export type CompleteProfileRequest = {
  firstName: string;
  lastName: string;
  gender: Gender;
  addressDetails: AddressPayload;
  phone?: string;
};

/**
 * Completes a new account's profile in ONE atomic request. It replaces the old
 * phone -> profile -> phone sequence of three calls (two of them touching Firebase),
 * which was slow and, if the first failed, failed silently.
 */
export function useCompleteProfile() {
  const queryClient = useQueryClient();
  const setProfile = useAuthStore((s) => s.setProfile);

  return useMutation({
    mutationFn: (payload: CompleteProfileRequest) =>
      apiFetch<User>("/api/users/me/complete-profile", { method: "PATCH", body: JSON.stringify(payload) }),
    onSuccess: (updated) => {
      setProfile(updated);
      queryClient.setQueryData(["me", updated.firebaseUid], updated);
      queryClient.invalidateQueries({ queryKey: ["users"] });
    },
  });
}
