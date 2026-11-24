import { useMutation } from "@tanstack/react-query";
import { EmailAuthProvider, reauthenticateWithCredential, updatePassword } from "firebase/auth";
import { firebaseAuth } from "@/lib/firebase/client";
import type { useTranslations } from "next-intl";

type ChangePasswordInput = { currentPassword: string; newPassword: string };

export function useChangePassword(t: ReturnType<typeof useTranslations<"auth.errors">>) {
  return useMutation({
    mutationFn: async ({ currentPassword, newPassword }: ChangePasswordInput) => {
      const user = firebaseAuth.currentUser;
      if (!user || !user.email) throw new Error(t("notSignedIn"));

      const credential = EmailAuthProvider.credential(user.email, currentPassword);
      await reauthenticateWithCredential(user, credential);
      await updatePassword(user, newPassword);
    },
  });
}