"use client";

import { useState } from "react";
import { useFormatter, useTranslations } from "next-intl";
import { Clock, HeartPulse, ShieldCheck, ShieldOff } from "lucide-react";
import { useDeleteMedicalProfile } from "@/hooks/users/useDeleteMedicalProfile";
import { useMedicalProfile } from "@/hooks/users/useMedicalProfile";
import { STALE_AFTER_MONTHS, isMedicalProfileEmpty, monthsSince } from "@/lib/medical/profile";
import type { MedicalProfile } from "@/types/medicalProfile";
import AccountCard from "./AccountCard";
import EditButton from "./EditButton";
import MedicalProfileDetails from "./MedicalProfileDetails";
import MedicalProfileForm from "./MedicalProfileForm";

export default function MedicalProfileCard() {
  const t = useTranslations("medicalProfile");
  const tCommon = useTranslations("common");
  const { data: profile, isLoading, isError } = useMedicalProfile();
  const [isEditing, setIsEditing] = useState(false);

  const stopEditing = () => setIsEditing(false);

  return (
    <AccountCard
      title={t("title")}
      description={t("description")}
      action={profile && !isEditing && <EditButton onClick={() => setIsEditing(true)} />}
    >
      {isLoading && <p className="text-sm text-slate-500 dark:text-slate-400">{tCommon("loading")}</p>}
      {isError && <p role="alert" className="text-sm text-red-600 dark:text-red-400">{t("loadError")}</p>}
      {profile &&
        (isEditing ? (
          <MedicalProfileForm profile={profile} onSaved={stopEditing} onCancel={stopEditing} />
        ) : (
          <MedicalProfileView profile={profile} onEdit={() => setIsEditing(true)} />
        ))}
    </AccountCard>
  );
}

function MedicalProfileView({ profile, onEdit }: { profile: MedicalProfile; onEdit: () => void }) {
  const t = useTranslations("medicalProfile");
  const format = useFormatter();

  if (isMedicalProfileEmpty(profile)) {
    return (
      <div className="flex flex-col items-center gap-3 py-4 text-center">
        <HeartPulse className="w-9 h-9 text-slate-300 dark:text-slate-600" />
        <p className="max-w-sm text-sm text-slate-500 dark:text-slate-400">{t("emptyState")}</p>
        <button
          type="button"
          onClick={onEdit}
          className="px-4 py-2 text-sm font-medium rounded-md cursor-pointer bg-blue-600 text-white hover:bg-blue-700 transition-colors"
        >
          {t("add")}
        </button>
      </div>
    );
  }

  const months = profile.updatedAt ? monthsSince(profile.updatedAt) : 0;
  const isStale = months >= STALE_AFTER_MONTHS;

  return (
    <div className="flex flex-col gap-6">
      {isStale && (
        <div className="flex flex-wrap items-center justify-between gap-3 rounded-lg border border-amber-200 dark:border-amber-900 bg-amber-50 dark:bg-amber-950/30 px-4 py-3">
          <p className="flex items-center gap-2 text-sm text-amber-800 dark:text-amber-300">
            <Clock className="w-4 h-4 shrink-0" />
            {t("staleNotice", { months })}
          </p>
          <button
            type="button"
            onClick={onEdit}
            className="text-sm font-medium cursor-pointer text-amber-900 dark:text-amber-200 underline underline-offset-2 hover:no-underline"
          >
            {t("review")}
          </button>
        </div>
      )}

      <MedicalProfileDetails profile={profile} />

      <footer className="flex flex-col gap-3 border-t border-slate-100 dark:border-slate-800 pt-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex flex-col gap-1 text-xs text-slate-500 dark:text-slate-400">
          <p className="inline-flex items-center gap-1.5">
            {profile.shareWithResponders ? (
              <ShieldCheck className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
            ) : (
              <ShieldOff className="w-3.5 h-3.5" />
            )}
            {profile.shareWithResponders ? t("sharing.statusOn") : t("sharing.statusOff")}
          </p>
          {profile.updatedAt && (
            <p>{t("lastUpdated", { date: format.dateTime(new Date(profile.updatedAt), { dateStyle: "medium" }) })}</p>
          )}
        </div>
        <DeleteMedicalProfile />
      </footer>
    </div>
  );
}

/** Two-step so a stray click can't wipe the profile. */
function DeleteMedicalProfile() {
  const t = useTranslations("medicalProfile");
  const tCommon = useTranslations("common");
  const deleteProfile = useDeleteMedicalProfile();
  const [isConfirming, setIsConfirming] = useState(false);

  if (!isConfirming) {
    return (
      <button
        type="button"
        onClick={() => setIsConfirming(true)}
        className="w-fit text-xs cursor-pointer text-slate-500 hover:text-red-600 dark:text-slate-400 dark:hover:text-red-400 hover:underline transition-colors"
      >
        {t("delete.action")}
      </button>
    );
  }

  return (
    <div role="alert" className="flex flex-wrap items-center gap-x-3 gap-y-2 text-xs">
      <span className="text-red-600 dark:text-red-400">{t("delete.confirm")}</span>
      <button
        type="button"
        onClick={() => setIsConfirming(false)}
        disabled={deleteProfile.isPending}
        className="cursor-pointer text-slate-600 dark:text-slate-300 hover:underline disabled:opacity-50"
      >
        {tCommon("cancel")}
      </button>
      <button
        type="button"
        onClick={() => deleteProfile.mutate()}
        disabled={deleteProfile.isPending}
        className="rounded-md bg-red-600 px-3 py-1.5 font-medium cursor-pointer text-white hover:bg-red-700 transition-colors disabled:opacity-50"
      >
        {t("delete.action")}
      </button>
    </div>
  );
}