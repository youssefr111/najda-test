"use client";

import { useTranslations } from "next-intl";
import { BriefcaseMedical, Flame, ShieldAlert } from "lucide-react";

const types = [
  { icon: BriefcaseMedical, label: "Medical", key: "medical" },
  { icon: Flame, label: "Fire", key: "fire" },
  { icon: ShieldAlert, label: "Police", key: "police" },
];

interface IncidentTypeSelectorProps {
  selected: string;
  onSelect: (label: string) => void;
}

export default function IncidentTypeSelector({ selected, onSelect }: IncidentTypeSelectorProps) {
  const t = useTranslations("incidentTypeSelector");

  return (
    <section className="space-y-4">
      <h2 className="text-[14px] leading-5 font-bold text-[#5b403f] dark:text-[#c9b8b6] uppercase tracking-wider">
        {t("title")}
      </h2>
      <div className="grid grid-cols-3 gap-3">
        {types.map((t2) => {
          const active = selected === t2.label;
          const Icon = t2.icon;
          return (
            <button
              key={t2.label}
              type="button"
              onClick={() => onSelect(t2.label)}
              aria-pressed={active}
              className={`flex flex-col items-center justify-center p-4 cursor-pointer rounded-xl border-2 active:scale-95 transition-all ${
                active
                  ? "border-[#b7102a] bg-[#db313f] text-white"
                  : "border-[#e4bebc] dark:border-[#3a2f2e] bg-[#f8f9fa] dark:bg-[#242426] hover:border-[#b7102a]"
              }`}
            >
              <Icon className="mb-2 h-9 w-9" strokeWidth={active ? 2.5 : 2} />
              <span className="text-[14px] leading-5 font-bold">{t(t2.key)}</span>
            </button>
          );
        })}
      </div>
    </section>
  );
}