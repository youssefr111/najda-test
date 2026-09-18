import { useMutation } from "@tanstack/react-query";
import { verifyBeforeUpdateEmail, fetchSignInMethodsForEmail } from "firebase/auth";
import { firebaseAuth } from "@/lib/firebase/client";
import type { useTranslations } from "next-intl";

export function useRequestEmailChange(t: ReturnType<typeof useTranslations<"auth.errors">>) {
  return useMutation({
    mutationFn: async (newEmail: string) => {
      if (!firebaseAuth.currentUser) throw new Error(t("notSignedIn"));

      const methods = await fetchSignInMethodsForEmail(firebaseAuth, newEmail);
      if (methods.length > 0) {
        throw new Error(t("emailAlreadyInUse"));
      }

      await verifyBeforeUpdateEmail(firebaseAuth.currentUser, newEmail);
    },
  });
}