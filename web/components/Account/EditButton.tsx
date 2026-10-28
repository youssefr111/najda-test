"use client";

import { useTranslations } from "next-intl";
import { Pencil } from "lucide-react";

export default function EditButton({ onClick }: { onClick: () => void }) {
  const t = useTranslations("common");

  return (
    <button
      type="button"
      onClick={onClick}
      className="inline-flex shrink-0 items-center gap-1.5 rounded-md border border-slate-200 dark:border-slate-700 px-3 py-1.5 text-sm font-medium text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors cursor-pointer"
    >
      <Pencil className="w-3.5 h-3.5" />
      {t("edit")}
    </button>
  );
}