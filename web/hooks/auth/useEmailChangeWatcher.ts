import { useEffect, useRef } from "react";
import { firebaseAuth } from "@/lib/firebase/client";
import { useSyncEmail } from "./useSyncEmail";

/**
 * Polls after a verifyBeforeUpdateEmail request, since there's no event for
 * "the confirmation link was clicked" -- that happens on a separate,
 * Firebase-hosted page with zero signal back to this app.
 * currentUser.reload() is the only way to ask "has it changed yet."
 * Pass null to stop polling.
 */
export function useEmailChangeWatcher(previousEmail: string | null) {
  const syncEmail = useSyncEmail();
  const stoppedRef = useRef(false);

  useEffect(() => {
    if (!previousEmail) return;
    stoppedRef.current = false;

    const interval = setInterval(async () => {
      if (stoppedRef.current) return;
      try {
        await firebaseAuth.currentUser?.reload();
        const currentEmail = firebaseAuth.currentUser?.email;
        if (currentEmail && currentEmail !== previousEmail) {
          stoppedRef.current = true;
          clearInterval(interval);
          await firebaseAuth.currentUser?.getIdToken(true);
          syncEmail.mutate();
        }
      } catch (err) {
        console.error("Email-change poll failed:", err);
      }
    }, 5000);

    return () => {
      stoppedRef.current = true;
      clearInterval(interval);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [previousEmail]);
}