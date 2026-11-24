"use client";

import { useTranslations } from "next-intl";
import { BadgeCheck, Phone } from "lucide-react";
import { useCallerContact } from "@/hooks/incidents/useCallerContact";

/**
 * The caller's phone number for a dispatcher or admin, with a "Verified" badge. The server only sends a number it
 * has verified, so nothing is shown at all when the caller has none (or an unconfirmed one).
 */
export default function CallerPhone({ incidentId }: { incidentId: number }) {
  const t = useTranslations("callerContact");
  const { data } = useCallerContact(incidentId);

  if (!data?.phone) return null;

  return (
    <div className="mt-1.5 flex flex-wrap items-center gap-2">
      <Phone className="h-3.5 w-3.5 text-slate-400 dark:text-slate-500" aria-hidden="true" />
      {/* Numbers read left-to-right even in the Arabic layout. */}
      <a
        href={`tel:${data.phone}`}
        dir="ltr"
        title={t("call")}
        className="text-sm font-medium text-slate-900 hover:underline dark:text-slate-100"
      >
        {data.phone}
      </a>
      <span
        title={t("verifiedHint")}
        className="inline-flex items-center gap-1 rounded-full bg-emerald-50 px-2 py-0.5 text-xs font-medium text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-300"
      >
        <BadgeCheck className="h-3.5 w-3.5" aria-hidden="true" />
        {t("verified")}
      </span>
    </div>
  );
}