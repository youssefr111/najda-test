"use client";

import { useTranslations } from "next-intl";
import { useIncidentVitals } from "@/hooks/hospitals/useIncidentVitals";
import { VitalsReadout } from "@/components/Hospital/VitalsPanel";
import type { HospitalTransfer } from "@/types/hospitalTransfer";

const STATUS_BADGE: Record<HospitalTransfer["status"], string> = {
  SELECTED: "bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-300",
  EN_ROUTE: "bg-amber-50 text-amber-700 dark:bg-amber-950/40 dark:text-amber-300",
  ARRIVED: "bg-emerald-50 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-300",
};

/**
 * The ambulance crew's patient vitals for an incident, live, for the end of any incident screen -- live or past.
 * Renders nothing when there is nothing the viewer may see, so it is safe to drop into every incident view.
 */
export default function IncidentVitalsSection({ incidentId }: { incidentId: number }) {
  const t = useTranslations("incidentVitals");
  const tTransferStatus = useTranslations("enums.transferStatus");
  const { data: transfers } = useIncidentVitals(incidentId);

  if (!transfers || transfers.length === 0) return null;

  return (
    <div>
      <p className="text-xs font-medium uppercase tracking-wide text-slate-400 dark:text-slate-500 mb-2">{t("title")}</p>
      <div className="flex flex-col gap-3">
        {transfers.map((transfer) => (
          <div key={transfer.hospitalTransferId} className="rounded-xl border border-slate-200 dark:border-slate-800 p-3 flex flex-col gap-3">
            <div className="flex items-center justify-between gap-2">
              <p className="min-w-0 truncate text-sm font-medium text-slate-900 dark:text-slate-100">
                {t("transferTo", { destination: transfer.destinationName ?? "—" })}
                {transfer.unitPlateNumber && <span className="font-normal text-slate-500 dark:text-slate-400"> · {transfer.unitPlateNumber}</span>}
              </p>
              <span className={`shrink-0 rounded-full px-2 py-0.5 text-xs font-medium ${STATUS_BADGE[transfer.status]}`}>{tTransferStatus(transfer.status)}</span>
            </div>
            {transfer.updates.length > 0 ? (
              <VitalsReadout updates={transfer.updates} />
            ) : (
              <p className="text-sm text-slate-500 dark:text-slate-400">{t("noneYet")}</p>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
