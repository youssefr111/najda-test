"use client";

import { useTranslations } from "next-intl";
import useTitle from "@/hooks/useTitle";
import AuthGuard from "@/components/Auth/AuthGuard";
import NotificationsFeed from "@/components/Notifications/NotificationsFeed";

function NotificationsContent() {
  const t = useTranslations("notifications");
  useTitle(`${t("title")} - NAJDA`);

  return (
    <main className="flex grow w-full min-h-screen flex-col bg-white dark:bg-slate-950 transition-colors">
      <NotificationsFeed />
    </main>
  );
}

export default function NotificationsPage() {
  return (
    <AuthGuard>
      <NotificationsContent />
    </AuthGuard>
  );
}
