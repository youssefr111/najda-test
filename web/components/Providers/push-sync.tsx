"use client";

import { useEffect } from "react";
import { useLocale } from "next-intl";
import { useQueryClient } from "@tanstack/react-query";
import useAuth from "@/hooks/auth/useAuth";
import { isPushSupported, onForegroundPush } from "@/lib/firebase/messaging";
import { isPushOptedOut, registerThisDevice } from "@/lib/notifications/device";

/**
 * Keeps this browser registered for push for as long as someone is signed in and
 * has allowed it -- and re-registers when the language changes, so pushes are
 * written in it. It never asks for permission itself (that needs a click: see
 * PushPrompt).
 */
export function PushSync() {
  const { user } = useAuth();
  const locale = useLocale();
  const queryClient = useQueryClient();
  const userId = user?.id;

  useEffect(() => {
    if (!userId) return;
    let stopForeground: (() => void) | undefined;
    let cancelled = false;

    void (async () => {
      if (!(await isPushSupported())) return;
      if (Notification.permission !== "granted" || isPushOptedOut()) return;

      await registerThisDevice(locale).catch((error) => console.warn("Push registration failed:", error));

      // A push that arrives while the page is open: the bell updates at once.
      const stop = await onForegroundPush(() => queryClient.invalidateQueries({ queryKey: ["notifications"] }));
      if (cancelled) stop();
      else stopForeground = stop;
    })();

    return () => {
      cancelled = true;
      stopForeground?.();
    };
  }, [userId, locale, queryClient]);

  return null;
}
