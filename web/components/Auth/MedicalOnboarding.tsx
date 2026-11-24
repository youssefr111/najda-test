"use client";

import { useTranslations } from "next-intl";
import { HeartPulse } from "lucide-react";
import MedicalProfileForm from "@/components/Account/MedicalProfileForm";
import { EMPTY_MEDICAL_PROFILE } from "@/types/medicalProfile";

/** The optional "add your medical profile" step shown once after registering. */
export default function MedicalOnboarding({ onFinish }: { onFinish: () => void }) {
  const t = useTranslations("medicalProfile.onboarding");

  return (
    <div className="flex min-h-[70vh] items-center justify-center px-4 py-8 sm:py-12">
      <div className="w-full max-w-2xl rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-sm">
        <div className="flex flex-col items-center gap-3 border-b border-slate-100 dark:border-slate-800 px-5 py-6 text-center sm:px-8 sm:py-8">
          <span className="flex size-12 items-center justify-center rounded-full bg-red-50 dark:bg-red-950/40 text-red-600 dark:text-red-400">
            <HeartPulse className="w-6 h-6" />
          </span>
          <span className="rounded-full bg-slate-100 dark:bg-slate-800 px-2.5 py-0.5 text-xs font-medium text-slate-600 dark:text-slate-300">
            {t("optional")}
          </span>
          <h1 className="text-xl font-semibold text-slate-900 dark:text-slate-100 sm:text-2xl">{t("title")}</h1>
          <p className="max-w-md text-sm text-slate-500 dark:text-slate-400">{t("subtitle")}</p>
        </div>

        <div className="px-5 py-6 sm:px-8 sm:py-8">
          <MedicalProfileForm
            profile={EMPTY_MEDICAL_PROFILE}
            onSaved={onFinish}
            onCancel={onFinish}
            submitLabel={t("save")}
            cancelLabel={t("skip")}
          />
        </div>
      </div>
    </div>
  );
}