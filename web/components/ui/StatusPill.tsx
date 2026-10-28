"use client";

import Link from "next/link";
import { useTranslations } from "next-intl";
import { useBackendStatus } from "@/hooks/useBackendStatus";

const DOT = {
  online: "bg-emerald-500",
  waking: "bg-amber-500 animate-pulse",
  degraded: "bg-orange-500",
  checking: "bg-slate-400 animate-pulse",
  unreachable: "bg-red-500",
  offline: "bg-red-500",
} as const;

export default function StatusPill() {
  const t = useTranslations("status");
  const { status } = useBackendStatus();

  return (
    <Link
      href="/status"
      className="inline-flex items-center gap-2 rounded-full border border-slate-200 px-3 py-1 text-xs font-medium text-slate-600 transition-colors hover:bg-slate-50 dark:border-slate-800 dark:text-slate-400 dark:hover:bg-slate-800/40"
    >
      <span className={`h-2 w-2 rounded-full ${DOT[status]}`} />
      {t(status)}
    </Link>
  );
}