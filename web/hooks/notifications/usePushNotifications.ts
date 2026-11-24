import { useCallback, useEffect, useState } from "react";
import { useLocale } from "next-intl";
import { isPushSupported } from "@/lib/firebase/messaging";
import {
  isPushOptedOut,
  registerThisDevice,
  setPushOptedOut,
  unregisterThisDevice,
} from "@/lib/notifications/device";

export type PushState =
  | "checking"
  | "unsupported" // this browser cannot do web push
  | "blocked" // the user (or browser) denied permission: only browser settings can fix it
  | "off" // available, not turned on
  | "on";

/**
 * State and actions for the "browser notifications" switch. `enable()` must be
 * called from a click handler: browsers only allow the permission prompt then.
 */
export function usePushNotifications() {
  const locale = useLocale();
  const [state, setState] = useState<PushState>("checking");
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    let cancelled = false;
    void (async () => {
      const supported = await isPushSupported();
      if (cancelled) return;
      if (!supported) return setState("unsupported");
      if (Notification.permission === "denied") return setState("blocked");
      setState(Notification.permission === "granted" && !isPushOptedOut() ? "on" : "off");
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const enable = useCallback(async () => {
    setBusy(true);
    try {
      const permission = await Notification.requestPermission();
      if (permission !== "granted") return setState(permission === "denied" ? "blocked" : "off");

      setPushOptedOut(false);
      setState((await registerThisDevice(locale)) ? "on" : "off");
    } finally {
      setBusy(false);
    }
  }, [locale]);

  const disable = useCallback(async () => {
    setBusy(true);
    try {
      setPushOptedOut(true);
      await unregisterThisDevice({ dropToken: true }).catch(() => undefined);
      setState("off");
    } finally {
      setBusy(false);
    }
  }, []);

  return { state, busy, enable, disable };
}
