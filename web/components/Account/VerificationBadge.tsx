"use client";

import { useTranslations } from "next-intl";
import { Check } from "lucide-react";

export default function VerificationBadge({ verified }: { verified: boolean }) {
  const t = useTranslations("account");

  if (verified) {
    return (
      <span className="inline-flex items-center gap-1 rounded-full bg-emerald-50 dark:bg-emerald-950/40 px-2 py-0.5 text-xs font-medium text-emerald-700 dark:text-emerald-400">
        <Check className="w-3 h-3" />
        {t("verified")}
      </span>
    );
  }

  return (
    <span className="inline-flex items-center rounded-full bg-amber-50 dark:bg-amber-950/40 px-2 py-0.5 text-xs font-medium text-amber-700 dark:text-amber-400">
      {t("unverified")}
    </span>
  );
}