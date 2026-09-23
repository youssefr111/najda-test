import { useMutation } from "@tanstack/react-query";
import { sendEmailVerification } from "firebase/auth";
import { firebaseAuth } from "@/firebase/client";

export function useResendEmailVerification() {
  return useMutation({
    mutationFn: async () => {
      if (!firebaseAuth.currentUser) throw new Error("Not signed in");
      await sendEmailVerification(firebaseAuth.currentUser);
    },
  });
}
