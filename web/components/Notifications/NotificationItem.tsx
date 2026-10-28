"use client";

import { useLocale } from "next-intl";
import { useRouter } from "next/navigation";
import useAuth from "@/hooks/auth/useAuth";
import { useNotificationActions } from "@/hooks/notifications/useNotificationActions";
import { notificationHref } from "@/lib/notifications/routes";
import { pickText, timeAgo } from "@/lib/notifications/text";
import type { AppNotification } from "@/types/notification";

/** One notification: unread ones are highlighted; clicking marks it read and opens what it is about. */
export default function NotificationItem({
  notification,
  onNavigate,
}: {
  notification: AppNotification;
  onNavigate?: () => void;
}) {
  const locale = useLocale();
  const router = useRouter();
  const { user } = useAuth();
  const { markRead } = useNotificationActions();

  function open() {
    if (!notification.read) markRead.mutate(notification.id);
    onNavigate?.();
    router.push(notificationHref(notification.type, notification.data, user?.roleName));
  }

  return (
    <button
      type="button"
      onClick={open}
      className={`flex w-full cursor-pointer items-start gap-3 px-4 py-3 text-start transition-colors hover:bg-slate-50 dark:hover:bg-slate-800 ${
        notification.read ? "" : "bg-blue-50/60 dark:bg-blue-950/30"
      }`}
    >
      <span
        aria-hidden
        className={`mt-1.5 h-2.5 w-2.5 shrink-0 rounded-full ${notification.read ? "bg-transparent" : "bg-blue-600"}`}
      />
      <span className="min-w-0 flex-1">
        <span
          className={`block text-sm text-slate-900 dark:text-slate-100 ${notification.read ? "font-medium" : "font-bold"}`}
        >
          {pickText(notification.title, locale)}
        </span>
        <span className="mt-0.5 block text-sm text-slate-600 dark:text-slate-300">{pickText(notification.body, locale)}</span>
        <span className="mt-1 block text-xs text-slate-400">{timeAgo(notification.createdAt, locale)}</span>
      </span>
    </button>
  );
}
