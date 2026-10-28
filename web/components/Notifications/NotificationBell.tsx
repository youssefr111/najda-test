"use client";

import { useRef, useState } from "react";
import Link from "next/link";
import { useTranslations } from "next-intl";
import { Bell } from "lucide-react";
import { useUnreadNotificationCount } from "@/hooks/notifications/useUnreadNotificationCount";
import { useNotifications } from "@/hooks/notifications/useNotifications";
import { useNotificationActions } from "@/hooks/notifications/useNotificationActions";
import { useDismissable } from "@/hooks/shared/useDismissable";
import { ICON_BUTTON } from "@/components/Header/styles";
import NotificationItem from "./NotificationItem";
import PushPrompt from "./PushPrompt";

const PREVIEW_COUNT = 8;

/** The header bell: live unread badge and a quick preview of the latest notifications. */
export default function NotificationBell() {
  const t = useTranslations("notifications");
  const [open, setOpen] = useState(false);
  const wrapperRef = useRef<HTMLDivElement | null>(null);

  const { data: unread = 0 } = useUnreadNotificationCount();
  // The list is only fetched once the panel is opened.
  const { data, isPending, isError, refetch } = useNotifications({ enabled: open });
  const { markAllRead } = useNotificationActions();

  useDismissable(wrapperRef, open, () => setOpen(false));

  const items = data?.pages[0]?.items.slice(0, PREVIEW_COUNT) ?? [];

  return (
    <div className="relative" ref={wrapperRef}>
      <button
        type="button"
        onClick={() => setOpen((value) => !value)}
        aria-label={t("bellLabel")}
        aria-haspopup="true"
        aria-expanded={open}
        className={`${ICON_BUTTON} relative`}
      >
        <Bell className="h-5 w-5" />
        {unread > 0 && (
          <span className="absolute -top-0.5 -inset-e-0.5 flex h-5 min-w-5 items-center justify-center rounded-full bg-red-600 px-1 text-[11px] font-bold text-white ring-2 ring-white dark:ring-[#171717]">
            {unread > 99 ? "99+" : unread}
          </span>
        )}
      </button>

      {open && (
        <div className="absolute inset-e-0 top-full z-50 mt-2 w-[min(22rem,calc(100vw-2rem))] overflow-hidden rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 shadow-xl animate-pop">
          <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 px-4 py-3">
            <h2 className="text-sm font-bold text-slate-900 dark:text-slate-100">{t("title")}</h2>
            {unread > 0 && (
              <button
                type="button"
                onClick={() => markAllRead.mutate()}
                className="cursor-pointer text-xs font-semibold text-blue-600 hover:underline"
              >
                {t("markAllRead")}
              </button>
            )}
          </div>

          <div className="max-h-96 overflow-y-auto divide-y divide-slate-100 dark:divide-slate-800">
            {isPending ? (
              <p className="px-4 py-6 text-center text-sm text-slate-500">{t("loading")}</p>
            ) : isError ? (
              <p className="px-4 py-6 text-center text-sm text-red-600">
                {t("loadError")}{" "}
                <button type="button" onClick={() => refetch()} className="cursor-pointer font-semibold underline">
                  {t("retry")}
                </button>
              </p>
            ) : items.length === 0 ? (
              <div className="px-4 py-8 text-center">
                <p className="text-sm font-semibold text-slate-700 dark:text-slate-200">{t("empty")}</p>
                <p className="mt-1 text-xs text-slate-500">{t("emptyHint")}</p>
              </div>
            ) : (
              items.map((notification) => (
                <NotificationItem key={notification.id} notification={notification} onNavigate={() => setOpen(false)} />
              ))
            )}
          </div>

          <div className="space-y-3 border-t border-slate-100 dark:border-slate-800 px-4 py-3">
            <PushPrompt compact />
            <Link
              href="/notifications"
              onClick={() => setOpen(false)}
              className="block text-center text-sm font-semibold text-blue-600 hover:underline"
            >
              {t("viewAll")}
            </Link>
          </div>
        </div>
      )}
    </div>
  );
}