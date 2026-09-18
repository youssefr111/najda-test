import { useMutation } from "@tanstack/react-query";
import { EmailAuthProvider, reauthenticateWithCredential, updatePassword } from "firebase/auth";
import { firebaseAuth } from "@/firebase/client";

type ChangePasswordInput = { currentPassword: string; newPassword: string };

export function useChangePassword() {
  return useMutation({
    mutationFn: async ({ currentPassword, newPassword }: ChangePasswordInput) => {
      const user = firebaseAuth.currentUser;
      if (!user || !user.email) throw new Error("Not signed in");

      const credential = EmailAuthProvider.credential(user.email, currentPassword);
      await reauthenticateWithCredential(user, credential);
      await updatePassword(user, newPassword);
    },
  });
}
