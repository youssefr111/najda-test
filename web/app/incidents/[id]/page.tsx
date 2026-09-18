"use client";

import { useParams } from "next/navigation";
import { useTranslations } from "next-intl";
import AuthGuard from "@/components/Auth/AuthGuard";
import Loading from "@/components/ui/Loading";
import { useIncident } from "@/hooks/incidents/useIncident";
import { CATEGORY_BADGE, categoryLabel, incidentStatusLabel, relativeTime } from "@/lib/dispatch/format";
import IncidentLocationMap from "@/components/Dispatch/IncidentLocationMap";
import IncidentMediaGallery from "@/components/Shared/IncidentMediaGallery";
import IncidentChatPanel from "@/components/Dispatch/IncidentChatPanel";

function IncidentHistoryContent() {
  const { id } = useParams<{ id: string }>();
  const t = useTranslations("enums");
  const tPage = useTranslations("incidentHistoryPage");
  const { data: incident, isLoading, isError } = useIncident(Number(id));

  if (isLoading) return <Loading />;
  if (isError || !incident) {
    return <main className="max-w-lg mx-auto px-4 py-12 text-sm text-slate-500 dark:text-slate-400">{tPage("noAccess")}</main>;
  }

  const textMessage = incident.media.find((m) => m.mediaType === "TEXT")?.textContent;
  const attachments = incident.media.filter((m) => m.mediaType !== "TEXT");

  return (
    <main className="max-w-2xl mx-auto px-4 py-8 flex flex-col gap-5">
      <div>
        <div className="flex items-center gap-2 flex-wrap">
          <h1 className="text-lg font-semibold text-slate-900 dark:text-slate-100">{tPage("incidentLabel", { id: incident.id })}</h1>
          <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${CATEGORY_BADGE[incident.category]}`}>{categoryLabel(t, incident.category)}</span>
        </div>
        <p className="text-sm text-slate-500 dark:text-slate-400 mt-0.5">
          {incident.citizenName} · {incidentStatusLabel(t, incident.status)} · {relativeTime(incident.createdAt)}
        </p>
      </div>

      <IncidentLocationMap latitude={incident.latitude} longitude={incident.longitude} />

      <div>
        {incident.address && <p className="text-xs text-slate-500 dark:text-slate-400 -mb-2">{incident.address}</p>}
        <p className="text-xs font-medium uppercase tracking-wide text-slate-400 dark:text-slate-500 mb-1">{tPage("messageLabel")}</p>
        <p className="text-sm text-slate-900 dark:text-slate-100">{textMessage || <span className="italic text-slate-400">{tPage("noMessage")}</span>}</p>
      </div>

      {attachments.length > 0 && <IncidentMediaGallery media={attachments} canDelete={false} />}

      <div>
        <p className="text-xs font-medium uppercase tracking-wide text-slate-400 dark:text-slate-500 mb-2">{tPage("chatHistoryLabel")}</p>
        <IncidentChatPanel incidentId={incident.id} readOnly />
      </div>
    </main>
  );
}

export default function IncidentHistoryPage() {
  return <AuthGuard><IncidentHistoryContent /></AuthGuard>;
}