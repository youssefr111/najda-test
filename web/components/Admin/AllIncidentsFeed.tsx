"use client";

import { useMemo, useState } from "react";
import { Search } from "lucide-react";
import { useTranslations } from "next-intl";
import { useAllIncidents } from "@/hooks/incidents/useAllIncidents";
import { CATEGORY_BADGE, categoryLabel, incidentStatusLabel } from "@/lib/dispatch/format";
import { relativeTime } from "@/lib/dispatch/format";
import AdminIncidentDetailPanel from "./AdminIncidentDetailPanel";
import type { Incident, IncidentStatus } from "@/types/incident";

const ALL_STATUSES: IncidentStatus[] = ["NEW", "AI_PROCESSED", "DISPATCHER_REVIEW", "ASSIGNED", "IN_PROGRESS", "RESOLVED", "CANCELLED"];

export default function AllIncidentsFeed() {
  const tEnums = useTranslations("enums");
  const tCommon = useTranslations("common");
  const t = useTranslations("allIncidents");
  const { data: incidents, isLoading } = useAllIncidents();
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<IncidentStatus | "all">("all");
  const [selected, setSelected] = useState<Incident | null>(null);

  const filtered = useMemo(() => {
    if (!incidents) return [];
    const q = searchQuery.trim().toLowerCase();
    return incidents.filter((i) => {
      const matchesStatus = statusFilter === "all" || i.status === statusFilter;
      const matchesQuery = !q || i.citizenName.toLowerCase().includes(q) || String(i.id).includes(q);
      return matchesStatus && matchesQuery;
    });
  }, [incidents, searchQuery, statusFilter]);

  return (
    <div className="flex flex-col lg:flex-row h-[calc(100vh-8rem)]">
      <div className="w-full lg:w-96 border-e border-slate-200 dark:border-slate-800 flex flex-col overflow-y-auto shrink-0">
        <div className="p-3 border-b border-slate-200 dark:border-slate-800 flex flex-col gap-2">
          <div className="relative">
            <Search className="absolute inset-s-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-400" />
            <input
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder={t("searchPlaceholder")}
              className="w-full ps-8 pe-2 py-1.5 text-sm bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-md text-slate-900 dark:text-slate-100"
            />
          </div>
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value as IncidentStatus | "all")}
            className="px-2 py-1.5 text-sm bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-md text-slate-900 dark:text-slate-100"
          >
            <option value="all">{t("allStatuses")}</option>
            {ALL_STATUSES.map((s) => (
              <option key={s} value={s}>{incidentStatusLabel(tEnums, s)}</option>
            ))}
          </select>
        </div>

        <div className="flex-1 overflow-y-auto">
          {isLoading ? (
            <p className="p-4 text-sm text-slate-500 dark:text-slate-400">{tCommon("loading")}</p>
          ) : filtered.length === 0 ? (
            <p className="p-4 text-sm text-slate-500 dark:text-slate-400">{t("noMatch")}</p>
          ) : (
            filtered.map((incident) => (
              <button
                key={incident.id}
                type="button"
                onClick={() => setSelected(incident)}
                className={`w-full text-start p-3 border-b border-slate-100 dark:border-slate-800/60 transition-colors ${selected?.id === incident.id ? "bg-blue-50 dark:bg-blue-950/30" : "hover:bg-slate-50 dark:hover:bg-slate-800/40"}`}
              >
                <div className="flex items-center justify-between gap-2">
                  <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${CATEGORY_BADGE[incident.category]}`}>{categoryLabel(tEnums, incident.category)}</span>
                  <span className="text-xs text-slate-400 dark:text-slate-500">{relativeTime(incident.createdAt)}</span>
                </div>
                <p className="mt-1.5 text-sm font-medium text-slate-900 dark:text-slate-100">#{incident.id} — {incident.citizenName}</p>
                <span className="text-xs text-slate-500 dark:text-slate-400">{incidentStatusLabel(tEnums, incident.status)}</span>
              </button>
            ))
          )}
        </div>
      </div>

      {selected ? (
        <AdminIncidentDetailPanel incident={selected} onDeleted={() => setSelected(null)} />
      ) : (
        <div className="flex-1 flex items-center justify-center text-sm text-slate-400 dark:text-slate-500">{t("selectPrompt")}</div>
      )}
    </div>
  );
}