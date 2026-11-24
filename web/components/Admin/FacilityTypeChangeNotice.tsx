import { useTranslations } from "next-intl";
import type { FacilityTypeChangeImpact } from "@/types/facility";

interface FacilityTypeChangeNoticeProps {
  impact: FacilityTypeChangeImpact | undefined;
  isLoading: boolean;
  /** The unit conversions, already worded for the current language ("2 Ambulance → Fire Truck"). */
  conversionSummary: string;
}

/** Tells the admin, right under the type field, what picking another type would do -- or why it isn't possible. */
export default function FacilityTypeChangeNotice({ impact, isLoading, conversionSummary }: FacilityTypeChangeNoticeProps) {
  const t = useTranslations("admin.facilities.form.impact");

  if (isLoading) return <span className="text-xs text-slate-500 dark:text-slate-400">{t("checking")}</span>;
  if (!impact) return null;

  const blockers = [
    impact.blockingStaff > 0 && t("blockedStaff", { count: impact.blockingStaff }),
    impact.blockingUnits > 0 && t("blockedUnits", { count: impact.blockingUnits }),
    impact.blockedByActiveTransfers && t("blockedTransfers"),
  ].filter(Boolean);

  if (blockers.length > 0) {
    return (
      <ul role="alert" className="list-disc ps-4 text-xs text-red-600 dark:text-red-400">
        {blockers.map((blocker) => (
          <li key={String(blocker)}>{blocker}</li>
        ))}
      </ul>
    );
  }

  if (impact.unitConversions.length > 0) {
    return <span className="text-xs text-amber-600 dark:text-amber-400">{t("willConvert", { summary: conversionSummary })}</span>;
  }

  return null;
}
