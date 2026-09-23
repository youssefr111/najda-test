"use client";

import { useMemo, useState } from "react";
import { useTranslations } from "next-intl";
import { Plus, Pencil, Trash2, Search } from "lucide-react";
import { RotateCcw } from "lucide-react";
import { useReconcileUnitStatuses } from "@/hooks/units/useReconcileUnitStatuses";
import { useAvailableUnits } from "@/hooks/units/useAvailableUnits";
import { useFacilities } from "@/hooks/facilities/useFacilities";
import { useForceEndShift } from "@/hooks/shifts/useForceEndShift";
import { useDeleteUnit } from "@/hooks/units/useDeleteUnit";
import { UNIT_TYPE_LABEL, UNIT_STATUS_BADGE } from "@/lib/dispatch/format";
import UnitFormModal from "./UnitFormModal";
import type { ResponseUnit } from "@/types/unit";

// Derived from the existing label/badge maps rather than a fresh import, so
// this always stays in sync with whatever unit types/statuses those cover.
type UnitTypeKey = keyof typeof UNIT_TYPE_LABEL;
type UnitStatusKey = keyof typeof UNIT_STATUS_BADGE;

export default function UnitsFeed() {
  const t = useTranslations("admin.units");
  const tEnums = useTranslations("enums");
  const tCommon = useTranslations("common");
  const { data: units, isLoading } = useAvailableUnits();
  const { data: allFacilities } = useFacilities();
  const reconcile = useReconcileUnitStatuses();
  const forceEndShift = useForceEndShift();
  const deleteUnit = useDeleteUnit();

  const [editing, setEditing] = useState<ResponseUnit | "new" | null>(null);
  const [confirmingDeleteId, setConfirmingDeleteId] = useState<number | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [typeFilter, setTypeFilter] = useState<UnitTypeKey | "all">("all");
  const [statusFilter, setStatusFilter] = useState<UnitStatusKey | "all">("all");

  const stationFacilities = allFacilities ?? [];

  const filtered = useMemo(() => {
    if (!units) return [];
    const q = searchQuery.trim().toLowerCase();
    return units.filter((u) => {
      if (typeFilter !== "all" && u.unitType !== typeFilter) return false;
      if (statusFilter !== "all" && u.status !== statusFilter) return false;
      if (!q) return true;
      return (
        (u.plateNumber ?? "").toLowerCase().includes(q) ||
        (u.facilityName ?? "").toLowerCase().includes(q) ||
        (u.currentLeadName ?? "").toLowerCase().includes(q)
      );
    });
  }, [units, searchQuery, typeFilter, statusFilter]);

  const isFiltering = searchQuery.trim() !== "" || typeFilter !== "all" || statusFilter !== "all";

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 md:px-8 py-6 sm:py-8 flex flex-col gap-6">
      <div className="flex items-center justify-between gap-4">
        <div>
          <h1 className="text-xl sm:text-2xl font-semibold text-slate-900 dark:text-slate-100">{t("title")}</h1>
          <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
            {isFiltering && units ? `${filtered.length} of ${units.length}` : `${units?.length ?? 0}`} {t("subtitle")}
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button type="button" onClick={() => setEditing("new")} className="flex items-center gap-1.5 px-3.5 py-2 bg-blue-600 text-white text-sm font-medium rounded-md hover:bg-blue-700 transition-colors shrink-0">
            <Plus className="w-4 h-4" /> {t("addUnit")}
          </button>
          <button type="button" onClick={() => reconcile.mutate()} disabled={reconcile.isPending} className="flex items-center gap-1.5 px-3.5 py-2 border border-slate-300 dark:border-slate-700 text-slate-700 dark:text-slate-200 text-sm font-medium rounded-md hover:bg-slate-50 dark:hover:bg-slate-800 disabled:opacity-50">
            <RotateCcw className={`w-4 h-4 ${reconcile.isPending ? "animate-spin" : ""}`} /> {tCommon("refresh")}
          </button>
        </div>
      </div>

      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl overflow-hidden">
        <div className="flex flex-col gap-3 p-4 border-b border-slate-200 dark:border-slate-800">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
            <input
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search by plate, station, or lead..."
              className="w-full pl-9 pr-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-md text-sm text-slate-900 dark:text-slate-100"
            />
          </div>

          <div className="flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-4">
            <div className="flex items-center gap-2 overflow-x-auto pb-1 sm:pb-0">
              <FilterChip active={typeFilter === "all"} onClick={() => setTypeFilter("all")}>{t("allTypes")}</FilterChip>
              {(Object.keys(UNIT_TYPE_LABEL) as UnitTypeKey[]).map((ut) => (
                <FilterChip key={ut} active={typeFilter === ut} onClick={() => setTypeFilter(ut)}>{tEnums(`unitType.${ut}`)}</FilterChip>
              ))}
            </div>

            <div className="flex items-center gap-2 overflow-x-auto pb-1 sm:pb-0">
              <FilterChip active={statusFilter === "all"} onClick={() => setStatusFilter("all")}>{t("allStatuses")}</FilterChip>
              {(Object.keys(UNIT_STATUS_BADGE) as UnitStatusKey[]).map((us) => (
                <FilterChip key={us} active={statusFilter === us} onClick={() => setStatusFilter(us)}>{tEnums(`unitStatus.${us}`)}</FilterChip>
              ))}
            </div>
          </div>
        </div>

        {isLoading ? (
          <p className="p-6 text-sm text-slate-500 dark:text-slate-400">Loading…</p>
        ) : !units || units.length === 0 ? (
          <p className="p-6 text-sm text-slate-500 dark:text-slate-400">No units yet.</p>
        ) : filtered.length === 0 ? (
          <p className="p-6 text-sm text-slate-500 dark:text-slate-400">No units match your search or filters.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-slate-200 dark:border-slate-800 text-left text-xs uppercase tracking-wide text-slate-500 dark:text-slate-400">
                  <th className="px-4 py-3 font-medium">Plate</th>
                  <th className="px-4 py-3 font-medium">Type</th>
                  <th className="px-4 py-3 font-medium">Station</th>
                  <th className="px-4 py-3 font-medium">Status</th>
                  <th className="px-4 py-3 font-medium">Lead</th>
                  <th className="px-4 py-3 font-medium text-right">Actions</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((u) => (
                  <tr key={u.id} className="border-b border-slate-100 dark:border-slate-800/60 hover:bg-slate-50 dark:hover:bg-slate-800/40 transition-colors">
                    <td className="px-4 py-3 font-medium text-slate-900 dark:text-slate-100">{u.plateNumber ?? "—"}</td>
                    <td className="px-4 py-3 text-slate-600 dark:text-slate-300">{tEnums(`unitType.${u.unitType}`)}</td>
                    <td className="px-4 py-3 text-slate-600 dark:text-slate-300">{u.facilityName ?? "—"}</td>
                    <td className="px-4 py-3"><span className={`px-2 py-0.5 rounded-full text-xs font-medium ${UNIT_STATUS_BADGE[u.status]}`}>{tEnums(`unitStatus.${u.status}`)}</span></td>
                    <td className="px-4 py-3 text-slate-600 dark:text-slate-300">{u.currentLeadName ?? "—"}</td>
                    <td className="px-4 py-3 text-right">
                      <div className="flex items-center justify-end gap-1">
                        {u.currentLeadName && (
                          <button type="button" onClick={() => forceEndShift.mutate(u.id)} disabled={forceEndShift.isPending} className="px-2.5 py-1 text-xs font-medium text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-950/30 rounded-md transition-colors disabled:opacity-50">
                            Force End Shift
                          </button>
                        )}
                        <button type="button" onClick={() => setEditing(u)} className="p-1.5 text-blue-600 dark:text-blue-400 hover:bg-blue-50 dark:hover:bg-blue-950/40 rounded-md transition-colors">
                          <Pencil className="w-3.5 h-3.5" />
                        </button>
                        {confirmingDeleteId === u.id ? (
                          <div className="flex items-center gap-1">
                            <button type="button" onClick={() => deleteUnit.mutate(u.id, { onSuccess: () => setConfirmingDeleteId(null) })} disabled={deleteUnit.isPending} className="px-2 py-1 bg-red-600 text-white text-xs font-medium rounded-md disabled:opacity-50">
                              {deleteUnit.isPending ? "…" : "Confirm"}
                            </button>
                            <button type="button" onClick={() => setConfirmingDeleteId(null)} className="text-xs text-slate-500 dark:text-slate-400">Cancel</button>
                          </div>
                        ) : (
                          <button type="button" onClick={() => setConfirmingDeleteId(u.id)} className="p-1.5 text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-950/30 rounded-md transition-colors">
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {deleteUnit.isError && (
        <p className="text-sm text-red-600 dark:text-red-400">{deleteUnit.error instanceof Error ? deleteUnit.error.message : "Couldn't delete unit."}</p>
      )}

      {editing && <UnitFormModal unit={editing === "new" ? null : editing} facilities={stationFacilities} onClose={() => setEditing(null)} />}
    </div>
  );
}

function FilterChip({ active, onClick, children }: { active: boolean; onClick: () => void; children: React.ReactNode }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`shrink-0 px-3 py-1.5 rounded-full text-xs font-medium transition-colors ${active ? "bg-slate-900 text-white dark:bg-slate-100 dark:text-slate-900" : "bg-slate-100 text-slate-600 hover:bg-slate-200 dark:bg-slate-800 dark:text-slate-300 dark:hover:bg-slate-700"}`}
    >
      {children}
    </button>
  );
}