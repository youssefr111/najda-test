import { useMutation } from "@tanstack/react-query";
import { sendEmailVerification } from "firebase/auth";
import { firebaseAuth } from "@/lib/firebase/client";
import type { useTranslations } from "next-intl";

export function useResendEmailVerification(t: ReturnType<typeof useTranslations<"auth.errors">>) {
  return useMutation({
    mutationFn: async () => {
      if (!firebaseAuth.currentUser) throw new Error(t("notSignedIn"));
      await sendEmailVerification(firebaseAuth.currentUser);
    },
  });
}