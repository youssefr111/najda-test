"use client";

import { useState } from "react";
import Link from "next/link";
import { useTranslations } from "next-intl";
import AuthGuard from "@/components/Auth/AuthGuard";
import useAuth from "@/hooks/auth/useAuth";
import Loading from "@/components/ui/Loading";
import { useMyApplications } from "@/hooks/applications/useMyApplications";
import { useSubmitApplication } from "@/hooks/applications/useSubmitApplication";
import { PendingDocumentGrid } from "@/components/Shared/DocumentTileGrid";


function ApplyContent() {
  const t = useTranslations("becomeResponderPage");
  const { user } = useAuth();
  const { data: applications, isLoading } = useMyApplications();
  const submitApplication = useSubmitApplication();
  const [motivation, setMotivation] = useState("");
  const [pendingFiles, setPendingFiles] = useState<File[]>([]);

  if (!user) return <Loading />;
  if (isLoading) return <Loading />;

  const pending = applications?.find((a) => a.status === "PENDING");
  const latest = applications?.[0];

  if (user.roleName !== "CITIZEN") {
    return <main className="max-w-lg mx-auto px-4 py-12 text-sm text-slate-500 dark:text-slate-400">{t("citizenOnly")}</main>;
  }

  if (!user.emailVerified || !user.phoneVerified) {
    return (
      <main className="max-w-lg mx-auto px-4 py-12 text-center">
        <h1 className="text-xl font-semibold text-slate-900 dark:text-slate-100 mb-2">{t("verifyFirstTitle")}</h1>
        <p className="text-sm text-slate-500 dark:text-slate-400">
          {t.rich("verifyFirstBody", { account: (chunks) => <Link href="/account" className="text-blue-600 dark:text-blue-400 hover:underline">{chunks}</Link> })}
        </p>
      </main>
    );
  }

  if (pending) {
    return (
      <main className="max-w-lg mx-auto px-4 py-12">
        <h1 className="text-xl font-semibold text-slate-900 dark:text-slate-100 mb-2">{t("pendingTitle")}</h1>
        <p className="text-sm text-slate-500 dark:text-slate-400">{t("pendingBody", { date: new Date(pending.submittedAt).toLocaleDateString() })}</p>
      </main>
    );
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const formData = new FormData();
    formData.append("motivation", motivation);
    pendingFiles.forEach((f) => formData.append("files", f));
    await submitApplication.mutateAsync(formData);
    setMotivation("");
    setPendingFiles([]);
  }

  return (
    <main className="max-w-lg mx-auto px-4 py-12">
      <h1 className="text-xl font-semibold text-slate-900 dark:text-slate-100 mb-1">{t("title")}</h1>
      <p className="text-sm text-slate-500 dark:text-slate-400 mb-6">{t("subtitle")}</p>

      {latest?.status === "REJECTED" && (
        <p className="text-sm text-amber-700 dark:text-amber-400 mb-4">
          {t("rejectedNotice", { reason: latest.reviewNotes ? `: ${latest.reviewNotes}` : "" })}
        </p>
      )}

      <form onSubmit={handleSubmit} className="flex flex-col gap-4">
        <textarea
          value={motivation}
          onChange={(e) => setMotivation(e.target.value)}
          required
          rows={5}
          placeholder={t("motivationPlaceholder")}
          className="px-3 py-2 border border-slate-300 dark:border-slate-700 rounded-md text-sm bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100"
        />
        <label className="flex flex-col gap-1.5">
          <span className="text-sm font-medium text-slate-700 dark:text-slate-300">{t("documentsLabel")}</span>
          <input
            type="file"
            multiple
            accept="image/*,.pdf,.doc,.docx"
            onChange={(e) => setPendingFiles(Array.from(e.target.files ?? []))}
            className="text-sm text-slate-600 dark:text-slate-300"
          />
        </label>
        {pendingFiles.length > 0 && (
          <PendingDocumentGrid files={pendingFiles} onRemove={(index) => setPendingFiles((files) => files.filter((_, i) => i !== index))} />
        )}
        {submitApplication.isError && <p className="text-sm text-red-600 dark:text-red-400">{submitApplication.error instanceof Error ? submitApplication.error.message : t("submitError")}</p>}
        <button type="submit" disabled={submitApplication.isPending || pendingFiles.length === 0} className="py-2.5 bg-blue-600 text-white text-sm font-medium rounded-md disabled:opacity-50">
          {submitApplication.isPending ? t("submitting") : t("submit")}
        </button>
        {pendingFiles.length === 0 && <p className="text-xs text-amber-600 dark:text-amber-400">{t("documentRequired")}</p>}
      </form>
    </main>
  );
}

export default function ApplyFirstResponderPage() {
  return <AuthGuard><ApplyContent /></AuthGuard>;
}