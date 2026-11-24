"use client";

import { useTranslations } from "next-intl";
import { HeartPulse } from "lucide-react";
import { useMedicalProfile } from "@/hooks/users/useMedicalProfile";

/**
 * Shown only to users who've given standing consent to share their medical profile.
 * Lets them withhold it for this one report -- e.g. when they're calling for someone else,
 * whose medical history their own would be wrong (and a privacy leak) to show.
 */
export default function MedicalSharingToggle({ checked, onChange }: { checked: boolean; onChange: (checked: boolean) => void }) {
  const t = useTranslations("emergencyConfirmation.medicalSharing");
  const { data: profile } = useMedicalProfile();

  if (!profile?.shareWithResponders) return null;

  return (
    <label className="flex cursor-pointer items-start gap-3 rounded-xl bg-[#edeeef] p-4 dark:bg-[#242426]">
      <HeartPulse className="mt-0.5 h-6 w-6 shrink-0 text-[#b7102a]" />
      <span className="flex flex-1 flex-col gap-0.5">
        <span className="text-base font-semibold leading-6 dark:text-[#f3f4f5]">{t("label")}</span>
        <span className="text-sm leading-5 text-[#5b403f] dark:text-[#c9b8b6]">{t("hint")}</span>
      </span>
      <input
        type="checkbox"
        checked={checked}
        onChange={(e) => onChange(e.target.checked)}
        className="mt-1 size-5 shrink-0 cursor-pointer accent-[#b7102a]"
      />
    </label>
  );
}