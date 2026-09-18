import { useEffect, useRef, type PropsWithChildren } from "react";
import { onAuthStateChanged } from "firebase/auth";
import { firebaseAuth } from "@/firebase/client";
import { useAuthStore } from "@/store/auth-store";

const BOOT_TIMEOUT_MS = 6000;

/**
 * Bridges Firebase's own auth state into the Zustand store the rest of the
 * app reads from. Mounted once, near the root -- everything else just
 * reads useAuthStore()/useAuth() and never touches firebase/auth directly.
 *
 * `status` starts as "loading" and every screen in the app (both the
 * (auth) and (app) root layouts) shows a full-screen spinner for as long
 * as it stays that way -- there was no ceiling on that at all before. If
 * Firebase's very first onAuthStateChanged callback never fires (a broken
 * AsyncStorage-backed persistence init is one realistic way that happens),
 * the whole app was stuck on a spinner with zero way out, and none of the
 * network-timeout work elsewhere ever got a chance to run, because this
 * runs before any of that. If nothing fires within BOOT_TIMEOUT_MS, this
 * forces "unauthenticated" as a safe default -- worst case, a real session
 * shows the login screen once and signing in again works normally.
 */
export function AuthListener({ children }: PropsWithChildren) {
  const setFirebaseUser = useAuthStore((s) => s.setFirebaseUser);
  const resolvedRef = useRef(false);

  useEffect(() => {
    const bootTimer = setTimeout(() => {
      if (!resolvedRef.current) {
        console.warn(
          "[AuthListener] Firebase's onAuthStateChanged never fired within " +
            BOOT_TIMEOUT_MS +
            "ms -- forcing unauthenticated so the app doesn't hang forever. " +
            "This usually means Firebase Auth failed to initialize (check Metro's logs for a red error above this warning)."
        );
        resolvedRef.current = true;
        setFirebaseUser(null);
      }
    }, BOOT_TIMEOUT_MS);

    const unsubscribe = onAuthStateChanged(firebaseAuth, (user) => {
      resolvedRef.current = true;
      clearTimeout(bootTimer);
      setFirebaseUser(user);
    });

    return () => {
      clearTimeout(bootTimer);
      unsubscribe();
    };
  }, [setFirebaseUser]);

  return <>{children}</>;
}