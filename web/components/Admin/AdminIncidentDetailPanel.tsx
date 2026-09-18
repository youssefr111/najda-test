"use client";

import { useState } from "react";
import { Trash2 } from "lucide-react";
import { useLocale, useTranslations } from "next-intl";
import useAuth from "@/hooks/auth/useAuth";
import { useDeleteIncident } from "@/hooks/incidents/useDeleteIncident";
import { useCompleteIncident } from "@/hooks/incidents/useCompleteIncident";
import { useRetryAiPriority } from "@/hooks/incidents/useRetryAiPriority";
import { useMarkDuplicate } from "@/hooks/incidents/useMarkDuplicate";
import { useDismissDuplicateSuggestion } from "@/hooks/incidents/useDismissDuplicateSuggestion";
import { useUnitAssignmentSelection } from "@/hooks/dispatch/useUnitAssignmentSelection";
import { CATEGORY_BADGE, categoryLabel, incidentStatusLabel, PRIORITY_BADGE, relativeTime } from "@/lib/dispatch/format";
import LiveOpsMap from "@/components/Dispatch/LiveOpsMap";
import UnitAssignmentPanel from "@/components/Dispatch/UnitAssignmentPanel";
import MissionStatusList from "@/components/Dispatch/MissionStatusList";
import IncidentChatPanel from "@/components/Dispatch/IncidentChatPanel";
import IncidentMediaGallery from "@/components/Shared/IncidentMediaGallery";
import MarkDuplicateModal from "./MarkDuplicateModal";
import type { Incident } from "@/types/incident";
import { LANGUAGES } from "@/lib/locale/languages";

const DISPATCH_ROLES = ["DISPATCHER", "ADMIN", "SUPER_ADMIN"];

export default function AdminIncidentDetailPanel({ incident, onDeleted }: { incident: Incident; onDeleted?: () => void }) {
  const locale = useLocale();
  const dir = LANGUAGES.find(l => l.id === locale)?.dir ?? "ltr";
    
  const t = useTranslations("incidentDetail");
  const tEnums = useTranslations("enums");
  const tCommon = useTranslations("common");
  const { user } = useAuth();
  const deleteIncident = useDeleteIncident();
  const completeIncident = useCompleteIncident();
  const retryAi = useRetryAiPriority();
  const markDuplicate = useMarkDuplicate();
  const dismissSuggestion = useDismissDuplicateSuggestion();
  const selection = useUnitAssignmentSelection(incident);
  const [confirmingDelete, setConfirmingDelete] = useState(false);
  const [confirmingComplete, setConfirmingComplete] = useState(false);
  const [markingDuplicate, setMarkingDuplicate] = useState(false);

  const textMessage = incident.media.find((m) => m.mediaType === "TEXT")?.textContent;
  const attachments = incident.media.filter((m) => m.mediaType !== "TEXT");
  const canAssign = incident.status !== "RESOLVED" && incident.status !== "CANCELLED";
  const isDispatchRole = DISPATCH_ROLES.includes(user?.roleName ?? "");
  const isAdminRole = user?.roleName === "ADMIN" || user?.roleName === "SUPER_ADMIN";

  return (
    <div className="flex-1 flex flex-col lg:flex-row overflow-hidden" dir={dir}>
      <div className="lg:w-3/5 h-64 lg:h-full shrink-0">
        <LiveOpsMap incident={incident} assignment={canAssign ? selection : undefined} />
      </div>

      <div className="lg:w-2/5 flex-1 overflow-y-auto p-4 sm:p-6 flex flex-col gap-5 border-t lg:border-t-0 lg:border-s border-slate-200 dark:border-slate-800">
        <div>
          <div className="flex items-center gap-2 flex-wrap">
            <h2 className="text-lg font-semibold text-slate-900 dark:text-slate-100">{t("incidentLabel", { id: incident.id })}</h2>
            <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${CATEGORY_BADGE[incident.category]}`}>{categoryLabel(tEnums, incident.category)}</span>
            {incident.aiPriority ? (
              <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${PRIORITY_BADGE[incident.aiPriority]}`}>{incident.aiPriority}</span>
            ) : (
              isDispatchRole && (
                <button type="button" onClick={() => retryAi.mutate(incident.id)} disabled={retryAi.isPending} className="px-2 py-0.5 rounded-full text-xs font-medium border border-slate-300 dark:border-slate-700 text-slate-500 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-800 disabled:opacity-50">
                  {retryAi.isPending ? t("retryingAi") : t("retryAi")}
                </button>
              )
            )}
          </div>
          <p className="text-sm text-slate-500 dark:text-slate-400 mt-0.5">
            {incident.citizenName} · {incidentStatusLabel(tEnums, incident.status)} · {relativeTime(incident.createdAt)}
          </p>
        </div>

        {incident.address && (
          <div>
            <p className="text-xs font-medium uppercase tracking-wide text-slate-400 dark:text-slate-500 mb-1">{t("addressLabel")}</p>
            <p className="text-xs text-slate-900 dark:text-slate-100">{incident.address}</p>
          </div>
        )}

        <div>
          <p className="text-xs font-medium uppercase tracking-wide text-slate-400 dark:text-slate-500 mb-1">{t("messageLabel")}</p>
          <p className="text-sm text-slate-900 dark:text-slate-100">{textMessage || <span className="text-slate-400 dark:text-slate-500 italic">{t("noMessage")}</span>}</p>
        </div>

        {attachments.length > 0 && (
          <div>
            <p className="text-xs font-medium uppercase tracking-wide text-slate-400 dark:text-slate-500 mb-2">{t("evidenceLabel", { count: attachments.length })}</p>
            <IncidentMediaGallery media={attachments} canDelete={isAdminRole} />
          </div>
        )}

        {canAssign && (
          <div>
            <p className="text-xs font-medium uppercase tracking-wide text-slate-400 dark:text-slate-500 mb-2">{t("assignUnitLabel")}</p>
            <UnitAssignmentPanel incident={incident} selection={selection} />
          </div>
        )}

        <div>
          <p className="text-xs font-medium uppercase tracking-wide text-slate-400 dark:text-slate-500 mb-2">{t("missionsLabel")}</p>
          <MissionStatusList incidentId={incident.id} />
        </div>

        <div>
          <p className="text-xs font-medium uppercase tracking-wide text-slate-400 dark:text-slate-500 mb-2">{t("chatLabel")}</p>
          <IncidentChatPanel incidentId={incident.id} readOnly={!canAssign} />
        </div>

        {incident.aiSuggestedDuplicateOfId && (
          <div className="flex items-center justify-between gap-2 p-2.5 rounded-md bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-900 flex-wrap">
            <span className="text-xs text-amber-800 dark:text-amber-300">
              {t("possibleDuplicate", { id: incident.aiSuggestedDuplicateOfId, confidence: Math.round((incident.aiDuplicateConfidence ?? 0) * 100) })}
            </span>
            <div className="flex gap-1.5 shrink-0">
              <button onClick={() => markDuplicate.mutate({ incidentId: incident.id, canonicalIncidentId: incident.aiSuggestedDuplicateOfId! })} className="px-2 py-1 bg-amber-600 text-white text-xs font-medium rounded-md">
                {tCommon("confirm")}
              </button>
              <button onClick={() => dismissSuggestion.mutate(incident.id)} className="px-2 py-1 border border-amber-300 dark:border-amber-800 text-amber-700 dark:text-amber-300 text-xs font-medium rounded-md">
                {t("notDuplicate")}
              </button>
            </div>
          </div>
        )}

        {isDispatchRole && canAssign && (
          <div className="flex flex-col gap-2 border-t border-slate-200 dark:border-slate-800 pt-4">
            <button type="button" onClick={() => setMarkingDuplicate(true)} className="text-sm text-slate-600 dark:text-slate-300 hover:underline self-start">
              {t("markAsDuplicate")}
            </button>

            {!confirmingComplete ? (
              <button type="button" onClick={() => setConfirmingComplete(true)} className="px-3 py-1.5 border border-emerald-300 dark:border-emerald-800 text-emerald-700 dark:text-emerald-400 text-sm font-medium rounded-md self-start">
                {t("markComplete")}
              </button>
            ) : (
              <div className="flex items-center gap-2 p-2.5 rounded-md bg-emerald-50 dark:bg-emerald-950/30 border border-emerald-200 dark:border-emerald-900">
                <span className="text-xs text-emerald-700 dark:text-emerald-400 flex-1">{t("completeWarning")}</span>
                <button onClick={() => completeIncident.mutate(incident.id, { onSuccess: () => setConfirmingComplete(false) })} className="px-2.5 py-1 bg-emerald-600 text-white text-xs font-medium rounded-md">{tCommon("confirm")}</button>
                <button onClick={() => setConfirmingComplete(false)} className="text-xs text-slate-500 dark:text-slate-400">{t("notDuplicate") && null}{tCommon("cancel")}</button>
              </div>
            )}
            {completeIncident.isError && <p className="text-xs text-red-600 dark:text-red-400">{completeIncident.error instanceof Error ? completeIncident.error.message : t("completeError")}</p>}
          </div>
        )}

        {user?.roleName === "SUPER_ADMIN" && (
          <div className="border-t border-slate-200 dark:border-slate-800 pt-4">
            {!confirmingDelete ? (
              <button type="button" onClick={() => setConfirmingDelete(true)} className="flex items-center gap-1.5 text-sm text-red-600 dark:text-red-400 hover:underline">
                <Trash2 className="w-4 h-4" /> {t("deleteIncident")}
              </button>
            ) : (
              <div className="flex items-center gap-3 p-3 rounded-md bg-red-50 dark:bg-red-950/30 border border-red-200 dark:border-red-900">
                <p className="text-sm text-red-700 dark:text-red-300 flex-1">{t("deleteWarning")}</p>
                <button
                  type="button"
                  onClick={() => deleteIncident.mutate(incident.id, { onSuccess: onDeleted })}
                  disabled={deleteIncident.isPending}
                  className="px-3 py-1.5 bg-red-600 text-white text-xs font-medium rounded-md hover:bg-red-700 disabled:opacity-50 shrink-0"
                >
                  {deleteIncident.isPending ? t("deleting") : t("confirmDelete")}
                </button>
                <button type="button" onClick={() => setConfirmingDelete(false)} className="text-xs text-slate-500 dark:text-slate-400 shrink-0">{tCommon("cancel")}</button>
              </div>
            )}
            {deleteIncident.isError && (
              <p className="text-sm text-red-600 dark:text-red-400 mt-2">{deleteIncident.error instanceof Error ? deleteIncident.error.message : t("deleteError")}</p>
            )}
          </div>
        )}
      </div>

      {markingDuplicate && <MarkDuplicateModal incident={incident} onClose={() => setMarkingDuplicate(false)} />}
    </div>
  );
}