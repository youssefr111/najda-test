"use client";

import { useTranslations } from "next-intl";
import { BadgeCheck, Clock, ShieldAlert, ShieldQuestion } from "lucide-react";
import type { KycStatus } from "@/lib/kyc/kyc";

const STYLES: Record<KycStatus, { cls: string; Icon: typeof BadgeCheck }> = {
  VERIFIED: { cls: "bg-emerald-50 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-300", Icon: BadgeCheck },
  IN_PROGRESS: { cls: "bg-blue-50 text-blue-700 dark:bg-blue-950/40 dark:text-blue-300", Icon: Clock },
  IN_REVIEW: { cls: "bg-amber-50 text-amber-800 dark:bg-amber-950/40 dark:text-amber-300", Icon: Clock },
  DECLINED: { cls: "bg-red-50 text-red-700 dark:bg-red-950/40 dark:text-red-300", Icon: ShieldAlert },
  EXPIRED: { cls: "bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-300", Icon: ShieldQuestion },
  ABANDONED: { cls: "bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-300", Icon: ShieldQuestion },
  NOT_STARTED: { cls: "bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-300", Icon: ShieldQuestion },
};

type KycBadgeProps = {
  status?: KycStatus;
  badgeOnly?: boolean;
};

/** The verification badge shown on account pages and in the admin user view. */
export default function KycBadge({
  status = "NOT_STARTED",
  badgeOnly = false,
}: KycBadgeProps) {
  const t = useTranslations("kyc.status");
  const { cls, Icon } = STYLES[status];

  return (
    <span
      title={badgeOnly ? t(status) : undefined}
      aria-label={badgeOnly ? t(status) : undefined}
      className={`inline-flex items-center gap-1 rounded-full ${
        badgeOnly ? "p-1.5" : "px-2.5 py-0.5"
      } text-xs font-medium ${cls}`}
    >
      <Icon className="h-3.5 w-3.5" aria-hidden="true" />
      {!badgeOnly && t(status)}
    </span>
  );
}
