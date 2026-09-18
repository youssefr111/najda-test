"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { useEditIncidentMessage } from "@/hooks/incidents/useEditIncidentMessage";
import { useAttachIncidentMedia } from "@/hooks/incidents/useAttachIncidentMedia";
import { useUpdateInjuredCount } from "@/hooks/incidents/useUpdateInjuredCount";
import IncidentLocationMap from "@/components/Dispatch/IncidentLocationMap";
import IncidentChatPanel from "@/components/Dispatch/IncidentChatPanel";
import IncidentMediaGallery from "@/components/Shared/IncidentMediaGallery";
import type { Incident, MediaType } from "@/types/incident";

const OPEN_STATUSES = ["NEW", "AI_PROCESSED", "DISPATCHER_REVIEW"];

export default function MyActiveIncidentPanel({ incident }: { incident: Incident }) {
  const t = useTranslations("myActiveIncidentPanel");
  const tIncident = useTranslations("incidentDetail");
  const tCommon = useTranslations("common");
  const tStatus = useTranslations("enums.incidentStatus");

  const editMessage = useEditIncidentMessage();
  const attachMedia = useAttachIncidentMedia();
  const updateInjuredCount = useUpdateInjuredCount();

  const textMedia = incident.media.find((m) => m.mediaType === "TEXT");
  const attachments = incident.media.filter((m) => m.mediaType !== "TEXT");
  const [editingText, setEditingText] = useState(false);
  const [draftText, setDraftText] = useState(textMedia?.textContent ?? "");

  const [editingCount, setEditingCount] = useState(false);
  const [draftCount, setDraftCount] = useState(incident.injuredCount);

  const canEdit = OPEN_STATUSES.includes(incident.status);

  async function handleAddMedia(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    const mediaType: Exclude<MediaType, "TEXT"> = file.type.startsWith("video") ? "VIDEO" : file.type.startsWith("audio") ? "AUDIO" : "PHOTO";
    attachMedia.mutate({ incidentId: incident.id, mediaType, file });
  }

  return (
    <div className="flex flex-col gap-5">
      <p className="text-xs font-medium uppercase tracking-wide text-slate-400 dark:text-slate-500">
        {tIncident("incidentLabel", { id: incident.id })} -- {tStatus(incident.status)}
      </p>

      <IncidentLocationMap latitude={incident.latitude} longitude={incident.longitude} />

      {incident.address && (
        <div>
          <p className="text-xs font-medium uppercase tracking-wide text-slate-400 dark:text-slate-500 mb-1">{tIncident("addressLabel")}</p>
          <p className="text-xs text-slate-900 dark:text-slate-100 -mb-2">{incident.address}</p>
        </div>
      )}

      <div>
        <p className="text-xs font-medium uppercase tracking-wide text-slate-400 dark:text-slate-500 mb-1">{t("yourMessage")}</p>
        {editingText ? (
          <div className="flex flex-col gap-2">
            <textarea
              value={draftText}
              onChange={(e) => setDraftText(e.target.value)}
              className="w-full p-2 border border-slate-300 dark:border-slate-700 rounded-md text-sm bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100"
            />
            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => textMedia && editMessage.mutate({ mediaId: textMedia.id, textContent: draftText }, { onSuccess: () => setEditingText(false) })}
                className="px-3 py-1.5 bg-blue-600 text-white text-sm rounded-md"
              >
                {tCommon("save")}
              </button>
              <button type="button" onClick={() => setEditingText(false)} className="px-3 py-1.5 text-sm text-slate-500">{tCommon("cancel")}</button>
            </div>
          </div>
        ) : (
          <div className="flex items-center justify-between gap-2">
            <p className="text-sm text-slate-900 dark:text-slate-100">{textMedia?.textContent || tIncident("noMessage")}</p>
            {canEdit && <button type="button" onClick={() => setEditingText(true)} className="text-xs text-blue-600 dark:text-blue-400 shrink-0">{tCommon("edit")}</button>}
          </div>
        )}
      </div>

      <div>
        <p className="text-xs font-medium uppercase tracking-wide text-slate-400 dark:text-slate-500 mb-1">{t("injured")}</p>
        {editingCount ? (
          <div className="flex items-center gap-2">
            <input
              type="number"
              min={0}
              value={draftCount}
              onChange={(e) => setDraftCount(Math.max(0, Number(e.target.value)))}
              className="w-20 px-2 py-1.5 border border-slate-300 dark:border-slate-700 rounded-md text-sm bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100"
            />
            <button
              type="button"
              onClick={() => updateInjuredCount.mutate({ incidentId: incident.id, injuredCount: draftCount }, { onSuccess: () => setEditingCount(false) })}
              disabled={updateInjuredCount.isPending}
              className="px-3 py-1.5 bg-blue-600 text-white text-sm rounded-md disabled:opacity-50"
            >
              {updateInjuredCount.isPending ? "…" : tCommon("save")}
            </button>
            <button type="button" onClick={() => setEditingCount(false)} className="px-3 py-1.5 text-sm text-slate-500">{tCommon("cancel")}</button>
          </div>
        ) : (
          <div className="flex items-center justify-between gap-2">
            <p className="text-sm text-slate-900 dark:text-slate-100">{incident.injuredCount}</p>
            {canEdit && (
              <button type="button" onClick={() => { setDraftCount(incident.injuredCount); setEditingCount(true); }} className="text-xs text-blue-600 dark:text-blue-400 shrink-0">
                {tCommon("edit")}
              </button>
            )}
          </div>
        )}
        {updateInjuredCount.isError && (
          <p className="text-xs text-red-600 dark:text-red-400 mt-1">{updateInjuredCount.error instanceof Error ? updateInjuredCount.error.message : t("updateError")}</p>
        )}
      </div>

      {attachments.length > 0 && (
        <div>
          <p className="text-xs font-medium uppercase tracking-wide text-slate-400 dark:text-slate-500 mb-2">{tIncident("evidenceLabel", { count: attachments.length })}</p>
          <IncidentMediaGallery media={attachments} canDelete={canEdit} />
        </div>
      )}

      {canEdit && (
        <label className="text-sm text-blue-600 dark:text-blue-400 cursor-pointer">
          {t("addMedia")}
          <input type="file" accept="image/*,video/*,audio/*" className="hidden" onChange={handleAddMedia} />
        </label>
      )}
      {attachMedia.isError && (
        <p className="text-xs text-red-600 dark:text-red-400">{attachMedia.error instanceof Error ? attachMedia.error.message : t("mediaError")}</p>
      )}

      <div>
        <p className="text-xs font-medium uppercase tracking-wide text-slate-400 dark:text-slate-500 mb-2">{tIncident("chatLabel")}</p>
        <IncidentChatPanel incidentId={incident.id} />
      </div>
    </div>
  );
}