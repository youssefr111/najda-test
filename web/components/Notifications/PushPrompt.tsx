"use client";

import { useTranslations } from "next-intl";
import { BellRing, BellOff } from "lucide-react";
import { usePushNotifications } from "@/hooks/notifications/usePushNotifications";

/**
 * The browser-notifications switch. Shows nothing when this browser cannot do
 * web push; explains the one case only the browser's own settings can fix.
 */
export default function PushPrompt({ compact = false }: { compact?: boolean }) {
  const t = useTranslations("notifications.push");
  const { state, busy, enable, disable } = usePushNotifications();

  if (state === "checking" || state === "unsupported") return null;

  if (state === "blocked") {
    return (
      <p className="flex items-start gap-2 rounded-lg bg-amber-50 dark:bg-amber-950/40 px-3 py-2 text-xs text-amber-800 dark:text-amber-200">
        <BellOff className="mt-0.5 h-4 w-4 shrink-0" />
        {t("blocked")}
      </p>
    );
  }

  if (state === "on") {
    return (
      <div className="flex items-center justify-between gap-3 text-xs text-slate-500 dark:text-slate-400">
        <span className="flex items-center gap-2">
          <BellRing className="h-4 w-4 text-emerald-600" />
          {t("enabled")}
        </span>
        <button
          type="button"
          onClick={disable}
          disabled={busy}
          className="cursor-pointer font-semibold text-slate-600 dark:text-slate-300 hover:underline disabled:opacity-50"
        >
          {t("disable")}
        </button>
      </div>
    );
  }

  return (
    <div
      className={`flex items-center justify-between gap-3 rounded-lg border border-blue-200 dark:border-blue-900 bg-blue-50 dark:bg-blue-950/40 ${
        compact ? "px-3 py-2" : "px-4 py-3"
      }`}
    >
      <p className="text-xs text-blue-900 dark:text-blue-100">{t("hint")}</p>
      <button
        type="button"
        onClick={enable}
        disabled={busy}
        className="shrink-0 cursor-pointer rounded-lg bg-blue-600 px-3 py-1.5 text-xs font-semibold text-white hover:bg-blue-700 disabled:opacity-50"
      >
        {busy ? t("enabling") : t("enable")}
      </button>
    </div>
  );
}
