"use client";

import { useTranslations } from "next-intl";
import type { HospitalTransfer } from "@/types/hospitalTransfer";

const STATUS_BADGE: Record<HospitalTransfer["status"], string> = {
  SELECTED: "bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-300",
  EN_ROUTE: "bg-amber-50 text-amber-700 dark:bg-amber-950/40 dark:text-amber-300",
  ARRIVED: "bg-emerald-50 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-300",
};

export default function IncomingTransferCard({ transfer, selected, onClick, muted }: { transfer: HospitalTransfer; selected: boolean; onClick: () => void; muted?: boolean }) {
  const t = useTranslations("incomingTransferCard");
  const tStatus = useTranslations("enums.transferStatus");

  return (
    <button
      type="button"
      onClick={onClick}
      className={`w-full text-left p-3 border-b border-slate-100 dark:border-slate-800/60 transition-colors ${selected ? "bg-blue-50 dark:bg-blue-950/30" : "hover:bg-slate-50 dark:hover:bg-slate-800/40"} ${muted ? "opacity-60" : ""}`}
    >
      <div className="flex items-center justify-between gap-2">
        <p className="text-sm font-medium text-slate-900 dark:text-slate-100">{t("transferLabel", { id: transfer.id })}</p>
        <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${STATUS_BADGE[transfer.status]}`}>{tStatus(transfer.status)}</span>
      </div>
      <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">{t("missionLabel", { id: transfer.missionId })}</p>
    </button>
  );
}