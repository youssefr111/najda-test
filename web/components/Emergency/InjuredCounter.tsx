"use client";

import { useTranslations } from "next-intl";
import { Minus, Plus, BoneFracture } from "lucide-react";

interface InjuredCounterProps {
  count: number;
  onChange: (count: number) => void;
}

export default function InjuredCounter({ count, onChange }: InjuredCounterProps) {
  const t = useTranslations("injuredCounter");

  return (
    <section className="flex items-center justify-between p-4 bg-[#edeeef] dark:bg-[#242426] rounded-xl">
      <div className="flex items-center gap-3">
        <BoneFracture className="h-6 w-6 text-[#b7102a]" />
        <span className="text-[20px] leading-7 font-semibold dark:text-[#f3f4f5]">
          {t("title")}
        </span>
      </div>
      <div className="flex items-center gap-4 bg-[#f8f9fa] dark:bg-[#1a1a1c] rounded-full p-1 border border-[#e4bebc] dark:border-[#3a2f2e]">
        <button
          type="button"
          aria-label={t("decrease")}
          onClick={() => onChange(Math.max(0, count - 1))}
          className="w-10 h-10 flex items-center justify-center rounded-full cursor-pointer bg-[#edeeef] dark:bg-[#2f2f31] hover:bg-[#e1e3e4] dark:hover:bg-[#3a3a3c]"
        >
          <Minus className="h-5 w-5 dark:text-[#f3f4f5]" />
        </button>
        <span className="text-2xl font-extrabold w-8 text-center transition-transform dark:text-[#f3f4f5]">
          {count}
        </span>
        <button
          type="button"
          aria-label={t("increase")}
          onClick={() => onChange(count + 1)}
          className="w-10 h-10 flex items-center justify-center rounded-full cursor-pointer bg-[#b7102a] text-white hover:opacity-90"
        >
          <Plus className="h-5 w-5 cursor-pointer" />
        </button>
      </div>
    </section>
  );
}