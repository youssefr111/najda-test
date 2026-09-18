"use client";

import { useMemo } from "react";
import { Search } from "lucide-react";
import { useTranslations } from "next-intl";
import { useIncidentQueue } from "@/hooks/incidents/useIncidentQueue";
import { useActiveIncidents } from "@/hooks/incidents/useActiveIncidents";
import { useDispatchStore } from "@/store/dispatch-store";
import { CATEGORY_BADGE, categoryLabel, incidentStatusLabel, PRIORITY_BADGE, relativeTime } from "@/lib/dispatch/format";
import type { Incident } from "@/types/incident";

export default function IncidentQueueList() {
  const t = useTranslations("incidentQueue");
  const tCommon = useTranslations("common");
  const { tab, setTab, searchQuery, setSearchQuery, selectedIncidentId, setSelectedIncidentId } = useDispatchStore();

  const queue = useIncidentQueue();
  const active = useActiveIncidents();
  const source = tab === "queue" ? queue : active;
  // eslint-disable-next-line react-hooks/exhaustive-deps
  const incidents = source.data ?? [];

  const filtered = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    if (!q) return incidents;
    return incidents.filter(
      (i) => i.citizenName.toLowerCase().includes(q) || i.category.toLowerCase().includes(q) || String(i.id).includes(q)
    );
  }, [incidents, searchQuery]);

  return (
    <div className="flex flex-col h-full border-e border-slate-200 dark:border-slate-800 w-full lg:w-96 shrink-0">
      <div className="p-3 border-b border-slate-200 dark:border-slate-800 flex flex-col gap-3">
        <div className="flex gap-2">
          <TabButton active={tab === "queue"} onClick={() => setTab("queue")} count={queue.data?.length}>{t("queue")}</TabButton>
          <TabButton active={tab === "active"} onClick={() => setTab("active")} count={active.data?.length}>{t("active")}</TabButton>
        </div>
        <div className="relative">
          <Search className="absolute inset-s-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-400" />
          <input
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder={t("searchPlaceholder")}
            className="w-full ps-8 pe-2 py-1.5 text-sm bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-md text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>
      </div>

      <div className="flex-1 overflow-y-auto">
        {source.isLoading ? (
          <p className="p-4 text-sm text-slate-500 dark:text-slate-400">{tCommon("loading")}</p>
        ) : filtered.length === 0 ? (
          <p className="p-4 text-sm text-slate-500 dark:text-slate-400">{tab === "queue" ? t("noQueue") : t("noActive")}</p>
        ) : (
          filtered.map((incident) => (
            <IncidentRow key={incident.id} incident={incident} selected={incident.id === selectedIncidentId} onClick={() => setSelectedIncidentId(incident.id)} />
          ))
        )}
      </div>
    </div>
  );
}

function TabButton({ active, onClick, count, children }: { active: boolean; onClick: () => void; count?: number; children: React.ReactNode }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`flex-1 flex items-center justify-center gap-1.5 py-1.5 rounded-md text-sm font-medium transition-colors ${
        active ? "bg-slate-900 text-white dark:bg-slate-100 dark:text-slate-900" : "bg-slate-100 text-slate-600 hover:bg-slate-200 dark:bg-slate-800 dark:text-slate-300 dark:hover:bg-slate-700"
      }`}
    >
      {children}
      {typeof count === "number" && <span className="text-xs opacity-70">({count})</span>}
    </button>
  );
}

function IncidentRow({ incident, selected, onClick }: { incident: Incident; selected: boolean; onClick: () => void }) {
  const t = useTranslations("enums");

  return (
    <button
      type="button"
      onClick={onClick}
      className={`w-full text-start p-3 border-b border-slate-100 dark:border-slate-800/60 transition-colors ${
        selected ? "bg-blue-50 dark:bg-blue-950/30" : "hover:bg-slate-50 dark:hover:bg-slate-800/40"
      }`}
    >
      <div className="flex items-center justify-between gap-2">
        <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${CATEGORY_BADGE[incident.category]}`}>
          {categoryLabel(t, incident.category)}
        </span>
        {incident.aiPriority && (
          <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${PRIORITY_BADGE[incident.aiPriority]}`}>
            {incident.aiPriority}
          </span>
        )}
      </div>
      <p className="mt-1.5 text-sm font-medium text-slate-900 dark:text-slate-100">#{incident.id} — {incident.citizenName}</p>
      <div className="flex items-center justify-between mt-1">
        <span className="text-xs text-slate-500 dark:text-slate-400">{incidentStatusLabel(t, incident.status)}</span>
        <span className="text-xs text-slate-400 dark:text-slate-500">{relativeTime(incident.createdAt)}</span>
      </div>
    </button>
  );
}