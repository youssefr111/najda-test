"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { X } from "lucide-react";
import { useIncidentQueue } from "@/hooks/incidents/useIncidentQueue";
import { useMarkDuplicate } from "@/hooks/incidents/useMarkDuplicate";
import { categoryLabel, relativeTime } from "@/lib/dispatch/format";
import type { Incident } from "@/types/incident";

export default function MarkDuplicateModal({ incident, onClose }: { incident: Incident; onClose: () => void }) {
  const t = useTranslations("markDuplicate");
  const tEnums = useTranslations("enums");
  const { data: queue } = useIncidentQueue();
  const markDuplicate = useMarkDuplicate();
  const [query, setQuery] = useState("");

  const candidates = (queue ?? []).filter(
    (i) => i.id !== incident.id && (!query || i.citizenName.toLowerCase().includes(query.toLowerCase()) || String(i.id).includes(query))
  );

  return (
    <div className="fixed inset-0 z-70 flex items-end sm:items-center justify-center bg-black/40 p-0 sm:p-4" onClick={onClose}>
      <div onClick={(e) => e.stopPropagation()} className="w-full sm:max-w-md bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-t-2xl sm:rounded-xl shadow-xl max-h-[80vh] overflow-y-auto">
        <div className="flex items-center justify-between px-5 py-4 border-b border-slate-200 dark:border-slate-800">
          <h3 className="text-base font-semibold text-slate-900 dark:text-slate-100">{t("title", { id: incident.id })}</h3>
          <button type="button" onClick={onClose} className="p-1.5 rounded-md text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800"><X className="w-4 h-4" /></button>
        </div>
        <div className="p-4 flex flex-col gap-3">
          <p className="text-xs text-slate-500 dark:text-slate-400">{t("description")}</p>
          <input value={query} onChange={(e) => setQuery(e.target.value)} placeholder={t("searchPlaceholder")} className="px-3 py-2 text-sm bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-md text-slate-900 dark:text-slate-100" />
          <div className="flex flex-col gap-1.5 max-h-64 overflow-y-auto">
            {candidates.length === 0 ? (
              <p className="text-sm text-slate-400 dark:text-slate-500 p-2">{t("noOpenIncidents")}</p>
            ) : (
              candidates.map((c) => (
                <button
                  key={c.id}
                  type="button"
                  onClick={() => markDuplicate.mutate({ incidentId: incident.id, canonicalIncidentId: c.id }, { onSuccess: onClose })}
                  disabled={markDuplicate.isPending}
                  className="flex items-center justify-between px-3 py-2 border border-slate-200 dark:border-slate-700 rounded-md text-left text-sm hover:bg-slate-50 dark:hover:bg-slate-800 disabled:opacity-50"
                >
                  <span className="text-slate-900 dark:text-slate-100">#{c.id} — {c.citizenName} ({categoryLabel(tEnums, c.category)})</span>
                  <span className="text-xs text-slate-400 dark:text-slate-500">{relativeTime(c.createdAt)}</span>
                </button>
              ))
            )}
          </div>
          {markDuplicate.isError && <p className="text-xs text-red-600 dark:text-red-400">{markDuplicate.error instanceof Error ? markDuplicate.error.message : t("error")}</p>}
        </div>
      </div>
    </div>
  );
}