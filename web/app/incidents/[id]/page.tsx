"use client";

import { useParams } from "next/navigation";
import { useTranslations } from "next-intl";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import AuthGuard from "@/components/Auth/AuthGuard";
import Loading from "@/components/ui/Loading";
import { useIncident } from "@/hooks/incidents/useIncident";
import { CATEGORY_BADGE, categoryLabel, incidentStatusLabel, relativeTime } from "@/lib/dispatch/format";
import IncidentLocationMap from "@/components/Dispatch/IncidentLocationMap";
import IncidentMediaGallery from "@/components/Shared/IncidentMediaGallery";
import IncidentChatPanel from "@/components/Dispatch/IncidentChatPanel";
import CancellationNotice from "@/components/Shared/CancellationNotice";

function IncidentHistoryContent() {
  const { id } = useParams<{ id: string }>();
  const t = useTranslations("enums");
  const tCommon = useTranslations("common");
  const tPage = useTranslations("incidentHistoryPage");
  const tIncident = useTranslations("incidentDetail");
  const { data: incident, isLoading, isError } = useIncident(Number(id));

  if (isLoading) return <Loading />;
  if (isError || !incident) {
    return (
      <main className="mx-auto flex w-full max-w-2xl flex-col items-center gap-3 px-4 py-12 text-center">
        <p role="alert" className="text-sm text-slate-500 dark:text-slate-400">
          {tPage("noAccess")}
        </p>
        <BackLink label={tCommon("back")} />
      </main>
    );
  }

  const textMessage = incident.media.find((m) => m.mediaType === "TEXT")?.textContent;
  const attachments = incident.media.filter((m) => m.mediaType !== "TEXT");

  return (
    <main className="mx-auto flex w-full max-w-2xl flex-col gap-5 px-4 py-6 sm:py-8">
      <BackLink label={tCommon("back")} />
      <div>
        <div className="flex flex-wrap items-center gap-2">
          <h1 className="text-lg font-semibold text-slate-900 dark:text-slate-100">
            {tPage("incidentLabel", { id: incident.id })}
          </h1>
          <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${CATEGORY_BADGE[incident.category]}`}>
            {categoryLabel(t, incident.category)}
          </span>
        </div>
        <p className="mt-0.5 text-sm text-slate-500 dark:text-slate-400">
          {incident.citizenName} · {incidentStatusLabel(t, incident.status)} · {relativeTime(incident.createdAt)}
        </p>
      </div>

      <CancellationNotice incident={incident} />

      <IncidentLocationMap latitude={incident.latitude} longitude={incident.longitude} />

      {incident.address && (
        <div>
          <p className="mb-1 text-xs font-medium uppercase tracking-wide text-slate-400 dark:text-slate-500">
            {tIncident("addressLabel")}
          </p>
          <p className="wrap-break-word text-xs text-slate-900 dark:text-slate-100 -mb-2">{incident.address}</p>
        </div>
      )}

      <div>
        <p className="mb-1 text-xs font-medium uppercase tracking-wide text-slate-400 dark:text-slate-500">
          {tPage("messageLabel")}
        </p>
        <p className="wrap-break-word text-sm text-slate-900 dark:text-slate-100">
          {textMessage || <span className="italic text-slate-400">{tPage("noMessage")}</span>}
        </p>
      </div>

      {attachments.length > 0 && (
        <div>
          <p className="mb-2 text-xs font-medium uppercase tracking-wide text-slate-400 dark:text-slate-500">
            {tIncident("evidenceLabel", { count: attachments.length })}
          </p>
          <IncidentMediaGallery media={attachments} canDelete={false} />
        </div>
      )}

      <div>
        <p className="mb-2 text-xs font-medium uppercase tracking-wide text-slate-400 dark:text-slate-500">
          {tPage("chatHistoryLabel")}
        </p>
        <IncidentChatPanel incidentId={incident.id} readOnly />
      </div>
    </main>
  );
}

function BackLink({ label }: { label: string }) {
  return (
    <Link
      href="/emergency"
      className="inline-flex w-fit items-center gap-1.5 text-sm font-medium text-slate-500 transition-colors hover:text-slate-900 dark:text-slate-400 dark:hover:text-slate-100"
    >
      <ArrowLeft className="h-4 w-4 shrink-0 rtl:rotate-180" strokeWidth={2.5} />
      {label}
    </Link>
  );
}

export default function IncidentHistoryPage() {
  return (
    <AuthGuard>
      <IncidentHistoryContent />
    </AuthGuard>
  );
}