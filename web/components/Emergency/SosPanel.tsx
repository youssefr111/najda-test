"use client";

import { useTranslations } from "next-intl";

export default function SosPanel({ setEmergencyStage }: { setEmergencyStage: React.Dispatch<React.SetStateAction<'initial' | 'confirmation'>> }) {
  const t = useTranslations("sosPanel");

  return (
    <aside className="w-full bg-[#f3f4f5] dark:bg-[#1a1a1c] border-b border-[#e4bebc] dark:border-[#3a2f2e] transition-colors">
      <div className="p-4 sm:p-6 space-y-4 sm:space-y-6 max-w-4xl mx-auto">
        <div>
          <h1 className="text-base sm:text-lg text-[#191c1d] dark:text-[#f3f4f5] font-medium">
            {t("title")}
          </h1>
          <p className="mt-2 text-sm sm:text-base text-[#5b403f] dark:text-[#c9b8b6] leading-6">
            {t("description")}
          </p>
        </div>

        <section className="rounded-xl border border-[#e4bebc] dark:border-[#3a2f2e] bg-[#f8f9fa] dark:bg-[#242426] p-6 sm:p-8 flex flex-col items-center gap-4 sm:gap-6 shadow-sm transition-colors">
          <div className="relative">
            <div className="absolute inset-0 rounded-full bg-[#b7102a]/20 dark:bg-[#d32f42]/25 blur-3xl scale-110" />
            <button
              onClick={() => setEmergencyStage('confirmation')} style={{ cursor: 'pointer' }}
              className="relative h-32 w-32 sm:h-40 sm:w-40 rounded-full bg-[#b7102a] dark:bg-[#d32f42] text-white text-lg sm:text-xl font-extrabold tracking-wider shadow-lg hover:bg-[#a00e24] dark:hover:bg-[#b7102a] transition-colors cursor-pointer active:scale-95"
            >
              {t("sosButton")}
            </button>
          </div>
          <div className="text-center">
            <p className="font-bold text-sm sm:text-base text-[#b7102a] dark:text-[#ff5c72]">
              {t("pressToCall")}
            </p>
          </div>
        </section>
      </div>
    </aside>
  );
}