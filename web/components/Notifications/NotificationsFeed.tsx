"use client";

import { useTranslations } from "next-intl";
import { useNotifications } from "@/hooks/notifications/useNotifications";
import { useNotificationActions } from "@/hooks/notifications/useNotificationActions";
import { useUnreadNotificationCount } from "@/hooks/notifications/useUnreadNotificationCount";
import NotificationItem from "./NotificationItem";
import PushPrompt from "./PushPrompt";

/** The full notification inbox page. */
export default function NotificationsFeed() {
  const t = useTranslations("notifications");
  const { data, isPending, isError, refetch, fetchNextPage, hasNextPage, isFetchingNextPage } = useNotifications();
  const { data: unread = 0 } = useUnreadNotificationCount();
  const { markAllRead } = useNotificationActions();

  const items = data?.pages.flatMap((page) => page.items) ?? [];

  return (
    <div className="mx-auto w-full max-w-2xl px-4 py-8">
      <div className="mb-4 flex items-center justify-between gap-3">
        <h1 className="text-2xl font-bold text-slate-900 dark:text-slate-100">{t("title")}</h1>
        {unread > 0 && (
          <button
            type="button"
            onClick={() => markAllRead.mutate()}
            className="cursor-pointer text-sm font-semibold text-blue-600 hover:underline"
          >
            {t("markAllRead")}
          </button>
        )}
      </div>

      <div className="mb-4">
        <PushPrompt />
      </div>

      <div className="overflow-hidden rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900">
        {isPending ? (
          <p className="px-4 py-10 text-center text-sm text-slate-500">{t("loading")}</p>
        ) : isError ? (
          <p className="px-4 py-10 text-center text-sm text-red-600">
            {t("loadError")}{" "}
            <button type="button" onClick={() => refetch()} className="cursor-pointer font-semibold underline">
              {t("retry")}
            </button>
          </p>
        ) : items.length === 0 ? (
          <div className="px-4 py-14 text-center">
            <p className="font-semibold text-slate-700 dark:text-slate-200">{t("empty")}</p>
            <p className="mt-1 text-sm text-slate-500">{t("emptyHint")}</p>
          </div>
        ) : (
          <div className="divide-y divide-slate-100 dark:divide-slate-800">
            {items.map((notification) => (
              <NotificationItem key={notification.id} notification={notification} />
            ))}
          </div>
        )}
      </div>

      {hasNextPage && (
        <button
          type="button"
          onClick={() => fetchNextPage()}
          disabled={isFetchingNextPage}
          className="mx-auto mt-4 block cursor-pointer rounded-lg border border-slate-300 dark:border-slate-700 px-4 py-2 text-sm font-semibold text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-800 disabled:opacity-50"
        >
          {t("loadMore")}
        </button>
      )}
    </div>
  );
}
