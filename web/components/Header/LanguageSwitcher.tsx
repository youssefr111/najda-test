"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { Earth } from "lucide-react";
import { useLocale } from "next-intl";
import SearchableSelect from "@/components/ui/SearchableSelect";
import { LANGUAGES } from "@/lib/locale/languages";

export default function LanguageSwitcher() {
  const tLanguage = useTranslations("language");
  const router = useRouter();
  const locale = useLocale();
  const [switching, setSwitching] = useState(false);

  async function switchTo(next: string) {
    if (next === locale || switching) return;
    setSwitching(true);
    await fetch("/api/locale", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ locale: next }),
    });
    router.refresh(); // re-fetches the Server Component tree, including the root layout, so the new cookie's locale takes effect immediately
    setSwitching(false);
  }

  return (
    <div className="flex w-full z-90 items-center justify-between px-4 py-3 text-sm cursor-pointer text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors">
      <div className="flex items-center gap-2">
        <Earth className="w-4 h-4 text-black dark:text-white" />
        <span>{tLanguage("label")}</span>
      </div>

      <SearchableSelect
        disabled={switching}
        showNone={false}
        showHint={false}
        showSearch={false}
        options={LANGUAGES.map((language, index) => ({
          value: index,
          label: language.name,
          hint: language.name.replace("_", " "),
        }))}
        value={LANGUAGES.findIndex((language) => language.id === locale)}
        onChange={(value) => {
          if (value === null) return;
          switchTo(LANGUAGES[value].id);
        }}
        placeholder={locale === "en" ? "Select Language" : "اختر اللغة"}
        searchPlaceholder={locale === "en" ? "Search…" : "ابحث…"}
      />
    </div>
  );
}