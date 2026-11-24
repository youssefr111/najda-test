"use client";

import { useTranslations } from "next-intl";
import { useTheme } from "next-themes";
import { Moon, Sun } from "lucide-react";
import { MENU_ITEM } from "./styles";

export default function ThemeDropdownItem() {
  const t = useTranslations("theme");
  const { resolvedTheme, setTheme } = useTheme();

  const isDark = resolvedTheme === "dark";

  return (
    <button
      type="button"
      role="switch"
      aria-checked={isDark}
      onClick={() => setTheme(isDark ? "light" : "dark")}
      className={`${MENU_ITEM} justify-between`}
    >
      <span className="flex items-center gap-3">
        {isDark ? <Moon className="h-4 w-4 text-indigo-500" /> : <Sun className="h-4 w-4 text-amber-500" />}
        {t("label")}
      </span>

      <span className={`relative h-6 w-11 shrink-0 rounded-full transition-colors ${isDark ? "bg-indigo-600" : "bg-slate-300 dark:bg-slate-600"}`}>
        <span
          className={`absolute inset-s-0.5 top-0.5 h-5 w-5 rounded-full bg-white shadow transition-transform ${
            isDark ? "translate-x-5 rtl:-translate-x-5" : ""
          }`}
        />
      </span>
    </button>
  );
}