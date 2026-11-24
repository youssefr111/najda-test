"use client";

import { useTranslations } from "next-intl";

interface IncidentDescriptionProps {
  value: string;
  onChange: (value: string) => void;
}

export default function IncidentDescription({ value, onChange }: IncidentDescriptionProps) {
  const t = useTranslations("incidentDescription");

  return (
    <section className="space-y-4">
      <label
        className="text-[14px] leading-5 font-bold text-[#5b403f] dark:text-[#c9b8b6] uppercase tracking-wider block"
        htmlFor="desc"
      >
        {t("label")}
      </label>
      <textarea
        id="desc"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="w-full min-h-30 p-4 bg-[#edeeef] dark:bg-[#242426] rounded-xl border-none focus:ring-2 focus:ring-[#b7102a] text-[18px] leading-6.5 dark:text-[#f3f4f5] placeholder:text-[#8f6f6e] dark:placeholder:text-[#6b6b6d]"
        placeholder={t("placeholder")}
      />
    </section>
  );
}