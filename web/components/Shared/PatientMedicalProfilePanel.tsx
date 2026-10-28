"use client";

import { useTranslations } from "next-intl";
import { HeartPulse, Lock } from "lucide-react";
import MedicalProfileDetails from "@/components/Account/MedicalProfileDetails";
import { useIncidentMedicalProfile } from "@/hooks/incidents/useIncidentMedicalProfile";
import { ApiError } from "@/lib/api/client";
import { isMedicalProfileEmpty } from "@/lib/medical/profile";

/**
 * The patient's medical profile, for the people treating them (dispatcher, medical crew, receiving hospital).
 * Access is decided by the server; this just renders what it's allowed to show.
 */
export default function PatientMedicalProfilePanel({ incidentId }: { incidentId: number }) {
  const t = useTranslations("patientMedicalProfile");
  const tCommon = useTranslations("common");
  const { data, isLoading, error } = useIncidentMedicalProfile(incidentId);

  // Not someone who may see it (e.g. a fire crew, or the incident has closed): show nothing, not an error.
  if (error instanceof ApiError && error.status === 403) return null;

  return (
    <section className="rounded-lg border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900">
      <header className="flex flex-wrap items-center justify-between gap-x-4 gap-y-1 border-b border-slate-100 dark:border-slate-800 px-4 py-3">
        <h3 className="flex items-center gap-2 text-sm font-semibold text-slate-900 dark:text-slate-100">
          <HeartPulse className="w-4 h-4 text-red-600 dark:text-red-400" />
          {t("title")}
        </h3>
        <p className="flex items-center gap-1 text-xs text-slate-500 dark:text-slate-400">
          <Lock className="w-3 h-3" />
          {t("auditNote")}
        </p>
      </header>

      <div className="p-4">
        {isLoading && <p className="text-sm text-slate-500 dark:text-slate-400">{tCommon("loading")}</p>}
        {error && <p role="alert" className="text-sm text-red-600 dark:text-red-400">{t("loadError")}</p>}
        {data && !data.shared && <p className="text-sm text-slate-500 dark:text-slate-400">{t("notShared")}</p>}
        {data?.shared && data.profile && (
          isMedicalProfileEmpty(data.profile)
            ? <p className="text-sm text-slate-500 dark:text-slate-400">{t("sharedButEmpty")}</p>
            : <MedicalProfileDetails profile={data.profile} />
        )}
      </div>
    </section>
  );
}