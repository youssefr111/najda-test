import { useMutation } from "@tanstack/react-query";
import { fetchSignInMethodsForEmail, verifyBeforeUpdateEmail } from "firebase/auth";
import { firebaseAuth } from "@/firebase/client";

export function useRequestEmailChange() {
  return useMutation({
    mutationFn: async (newEmail: string) => {
      if (!firebaseAuth.currentUser) throw new Error("Not signed in");

      const methods = await fetchSignInMethodsForEmail(firebaseAuth, newEmail);
      if (methods.length > 0) {
        throw new Error("emailAlreadyInUse");
      }

      // Sends a confirmation link to the NEW address, hosted entirely by
      // Firebase -- no page on our own domain is involved, so this is just
      // as portable to mobile as it is on web.
      await verifyBeforeUpdateEmail(firebaseAuth.currentUser, newEmail);
    },
  });
}
