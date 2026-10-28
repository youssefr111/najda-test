"use client";

import { useEffect } from "react";
import { onAuthStateChanged } from "firebase/auth";
import { useQueryClient } from "@tanstack/react-query";
import { firebaseAuth } from "@/lib/firebase/client";
import { useAuthStore } from "@/store/auth-store";
import { useSyncEmail } from "@/hooks/auth/useSyncEmail";

export function AuthListener() {
  const setFirebaseUser = useAuthStore((s) => s.setFirebaseUser);
  const reset = useAuthStore((s) => s.reset);
  const queryClient = useQueryClient();
  const syncEmail = useSyncEmail();

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(firebaseAuth, (user) => {
      setFirebaseUser(user);
      if (!user) {
        reset();
        queryClient.removeQueries({ queryKey: ["me"] });
      } else {
        // Best-effort, fire-and-forget. verifyBeforeUpdateEmail's
        // confirmation link can be clicked minutes/days later, on another
        // device -- rather than try to catch that exact moment, just ask
        // on every sign-in. Harmless no-op if nothing changed, and
        // harmless if it fires before backend registration exists yet
        // (mid email-verification signup) -- it just fails quietly.
        syncEmail.mutate(undefined, {
          onError: (err) => console.error("Defensive sync-email failed:", err),
        });
      }
    });
    return unsubscribe;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [setFirebaseUser, reset, queryClient]);

  return null;
}