"use client";

import { useTranslations } from "next-intl";
import { useTheme } from "next-themes";
import { Moon, Sun } from "lucide-react";

export default function ThemeDropdownItem() {
  const t = useTranslations("theme");
  const { resolvedTheme, setTheme } = useTheme();

  const isDark = resolvedTheme === "dark";

  return (
    <button
      type="button"
      onClick={() => setTheme(isDark ? "light" : "dark")}
      className="flex w-full items-center justify-between px-4 py-3 text-sm cursor-pointer text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors"
    >
      <div className="flex items-center gap-2">
        {isDark ? (
          <Moon className="w-4 h-4 text-indigo-500" />
        ) : (
          <Sun className="w-4 h-4 text-amber-500" />
        )}
        <span>{t("label")}</span>
      </div>

      <div
        className={`relative h-6 w-11 rounded-full transition-colors ${
          isDark ? "bg-indigo-600" : "bg-slate-300"
        }`}
      >
        <div
          className={`absolute top-0.5 h-5 w-5 rounded-full bg-white shadow transition-transform ${
            isDark ? "translate-x-5" : "translate-x-0.5"
          }`}
        />
      </div>
    </button>
  );
} 