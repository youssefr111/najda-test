"use client";

import { useState } from "react";
import { useTranslations, useLocale } from "next-intl";
import { LANGUAGES } from "@/lib/locale/languages";
import { useHospitalTransfers } from "@/hooks/hospitals/useHospitalTransfers";
import IncomingTransferCard from "./IncomingTransferCard";
import IncomingTransferMap from "./IncomingTransferMap";
import VitalsPanel from "./VitalsPanel";

export default function HospitalFeed({ hospitalId, hospitalName }: { hospitalId: number; hospitalName: string | null }) {
  const locale = useLocale();
  const dir = LANGUAGES.find(l => l.id === locale)?.dir ?? "ltr";

  const t = useTranslations("hospitalFeed");
  const tCommon = useTranslations("common");
  const { data: transfers, isLoading } = useHospitalTransfers(hospitalId);
  const [selectedTransferId, setSelectedTransferId] = useState<number | null>(null);

  const incoming = transfers?.filter((t) => t.status !== "ARRIVED") ?? [];
  const arrived = transfers?.filter((t) => t.status === "ARRIVED") ?? [];
  const selectedTransfer = transfers?.find((t) => t.id === selectedTransferId) ?? null;

  return (
    <div className="flex flex-col lg:flex-row h-[calc(100vh-4rem)]" dir={dir}>
      <div className="w-full lg:w-96 border-r border-slate-200 dark:border-slate-800 flex flex-col overflow-y-auto">
        <div className="p-4 border-b border-slate-200 dark:border-slate-800">
          <h1 className="text-lg font-semibold text-slate-900 dark:text-slate-100">{hospitalName ?? t("defaultTitle")}</h1>
          <p className="text-sm text-slate-500 dark:text-slate-400">{t("subtitle")}</p>
        </div>

        {isLoading ? (
          <p className="p-4 text-sm text-slate-500 dark:text-slate-400">{tCommon("loading")}</p>
        ) : incoming.length === 0 ? (
          <p className="p-4 text-sm text-slate-500 dark:text-slate-400">{t("noIncoming")}</p>
        ) : (
          incoming.map((t) => <IncomingTransferCard key={t.id} transfer={t} selected={t.id === selectedTransferId} onClick={() => setSelectedTransferId(t.id)} />)
        )}

        {arrived.length > 0 && (
          <div className="p-4 border-t border-slate-200 dark:border-slate-800">
            <p className="text-xs font-medium uppercase tracking-wide text-slate-400 dark:text-slate-500 mb-2">{t("arrivedToday")}</p>
            {arrived.map((t) => (
              <IncomingTransferCard key={t.id} transfer={t} selected={t.id === selectedTransferId} onClick={() => setSelectedTransferId(t.id)} muted />
            ))}
          </div>
        )}
      </div>

      <div className="flex-1 overflow-y-auto p-4 sm:p-6 flex flex-col gap-4">
        {selectedTransfer ? (
          <>
            {selectedTransfer.status !== "ARRIVED" && <IncomingTransferMap transfer={selectedTransfer} hospitalId={hospitalId} />}
            <VitalsPanel hospitalTransferId={selectedTransfer.id} />
          </>
        ) : (
          <div className="h-full flex items-center justify-center text-sm text-slate-400 dark:text-slate-500">{t("selectPrompt")}</div>
        )}
      </div>
    </div>
  );
}