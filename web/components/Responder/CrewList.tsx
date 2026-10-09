"use client";

import { useTranslations } from "next-intl";
import { useCrewForUnit } from "@/hooks/shifts/useCrewForUnit";

export default function CrewList({ unitId }: { unitId: number }) {
  const t = useTranslations("crewList");
  const tShiftRole = useTranslations("enums.shiftRole");
  const { data: crew, isLoading } = useCrewForUnit(unitId);

  if (isLoading) return <p className="text-sm text-slate-500 dark:text-slate-400">{t("loading")}</p>;
  if (!crew || crew.length === 0) return null;

  return (
    <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-4">
      <p className="text-xs font-medium uppercase tracking-wide text-slate-400 dark:text-slate-500 mb-2">{t("yourCrew")}</p>
      <div className="flex flex-col gap-2">
        {crew.map((c) => (
          <div key={c.id} className="flex items-center justify-between">
            <span className="text-sm text-slate-900 dark:text-slate-100">{c.employeeName}</span>
            <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${c.roleInShift === "LEAD" ? "bg-blue-50 text-blue-700 dark:bg-blue-950/40 dark:text-blue-300" : "bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-300"}`}>
              {tShiftRole(c.roleInShift)}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}