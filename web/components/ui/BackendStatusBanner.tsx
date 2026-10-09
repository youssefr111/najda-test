"use client";

import { useTranslations } from "next-intl";
import { LoaderCircle, TriangleAlert, WifiOff, ServerOff } from "lucide-react";
import { useBackendStatus } from "@/hooks/useBackendStatus";

export default function BackendStatusBanner() {
  const t = useTranslations("status");
  const { status } = useBackendStatus();

  if (status === "online" || status === "checking") return null;

  const tone =
  status === "unreachable"
    ? "bg-red-100 text-red-900 dark:bg-red-950 dark:text-red-200"
    : status === "degraded"
    ? "bg-orange-100 text-orange-900 dark:bg-orange-950 dark:text-orange-200"
    : "bg-amber-100 text-amber-900 dark:bg-amber-950 dark:text-amber-200";

  return (
    <div
      role="status"
      className={`flex items-center justify-center gap-2 px-4 py-2 text-center text-sm font-medium ${tone}`}
    >
      {status === "offline" && (
        <>
          <WifiOff className="h-4 w-4 shrink-0" />
          {t("bannerOffline")}
        </>
      )}
      {status === "unreachable" && (
        <>
          <ServerOff className="h-4 w-4 shrink-0" />
          {t("bannerUnreachable")}
        </>
      )}
      {status === "degraded" && (
        <>
          <TriangleAlert className="h-4 w-4 shrink-0" />
          {t("bannerDegraded")}
        </>
      )}
      {status === "waking" && (
        <>
          <LoaderCircle className="h-4 w-4 shrink-0 animate-spin" />
          {t("bannerWaking")}
        </>
      )}
    </div>
  );
}