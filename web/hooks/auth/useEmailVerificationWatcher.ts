import { useEffect, useRef } from "react";
import { firebaseAuth } from "@/lib/firebase/client";
import { useSyncEmail } from "./useSyncEmail";

// Same reasoning as the email-change watcher: verification happens on a
// separate Firebase-hosted page with no event back to this app, so
// polling currentUser.reload() is the only way to notice it happened.
export function useEmailVerificationWatcher(active: boolean) {
  const syncEmail = useSyncEmail();
  const stoppedRef = useRef(false);

  useEffect(() => {
    if (!active) return;
    stoppedRef.current = false;

    const interval = setInterval(async () => {
      if (stoppedRef.current) return;
      try {
        await firebaseAuth.currentUser?.reload();
        if (firebaseAuth.currentUser?.emailVerified) {
          stoppedRef.current = true;
          clearInterval(interval);
          await firebaseAuth.currentUser?.getIdToken(true);
          syncEmail.mutate();
        }
      } catch (err) {
        console.error("Email-verification poll failed:", err);
      }
    }, 5000);

    return () => {
      stoppedRef.current = true;
      clearInterval(interval);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [active]);
}