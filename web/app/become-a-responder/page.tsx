"use client";

import { useEffect, useState, type FormEvent } from "react";
import Link from "next/link";
import { useTranslations } from "next-intl";
import { Clock, Lock, UploadCloud, type LucideIcon } from "lucide-react";
import AuthGuard from "@/components/Auth/AuthGuard";
import useAuth from "@/hooks/auth/useAuth";
import Loading from "@/components/ui/Loading";
import VerifyAccountPanel from "@/components/Kyc/VerifyAccountPanel";
import { useKycStatus } from "@/hooks/kyc/useKyc";
import { useMyApplications } from "@/hooks/applications/useMyApplications";
import { useSubmitApplication } from "@/hooks/applications/useSubmitApplication";
import { PendingDocumentGrid } from "@/components/Shared/DocumentTileGrid";
import { ACCEPT, MAX_FILE_MB, MAX_TOTAL_MB, checkDocuments, type DocumentProblem } from "@/lib/applications/documentRules";
import type { ApplicationStatus, FirstResponderApplication } from "@/types/firstResponderApplication";

const DRAFT_TTL_MS = 24 * 60 * 60 * 1000; // saved documents expire quietly rather than lingering on the device

interface FileDraft {
  files: File[];
  savedAt: number;
}

/** Files can't live in sessionStorage, so attached documents are kept in IndexedDB. Fails quietly if unavailable. */
function fileDraft(run: (store: IDBObjectStore) => IDBRequest): Promise<unknown> {
  return new Promise((resolve) => {
    const open = indexedDB.open("najda-drafts", 1);
    open.onupgradeneeded = () => open.result.createObjectStore("drafts");
    open.onerror = () => resolve(undefined);
    open.onsuccess = () => {
      const db = open.result;
      try {
        const request = run(db.transaction("drafts", "readwrite").objectStore("drafts"));
        request.onsuccess = () => { resolve(request.result); db.close(); };
        request.onerror = () => { resolve(undefined); db.close(); };
      } catch {
        resolve(undefined);
        db.close();
      }
    };
  });
}

const TONES = {
  blue: "bg-blue-100 text-blue-600 dark:bg-blue-950/50 dark:text-blue-400",
  amber: "bg-amber-100 text-amber-600 dark:bg-amber-950/40 dark:text-amber-400",
  slate: "bg-slate-100 text-slate-500 dark:bg-slate-800 dark:text-slate-400",
} as const;

/** A centered message card for the states where the form isn't available yet. */
function StatusCard({ icon: Icon, tone, title, actions, children }: {
  icon: LucideIcon;
  tone: keyof typeof TONES;
  title: string;
  actions?: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <main className="flex min-h-[60vh] items-center justify-center px-4 py-10">
      <section className="w-full max-w-md rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-6 sm:p-8 text-center shadow-sm">
        <div className={`mx-auto flex h-14 w-14 items-center justify-center rounded-full ${TONES[tone]}`}>
          <Icon className="h-7 w-7" aria-hidden="true" />
        </div>
        <h1 className="mt-5 text-xl sm:text-2xl font-semibold text-slate-900 dark:text-slate-100">{title}</h1>
        <div className="mt-2 text-sm sm:text-base leading-relaxed text-slate-500 dark:text-slate-400">{children}</div>
        {actions && <div className="mt-6 flex flex-col gap-3 sm:flex-row sm:justify-center">{actions}</div>}
      </section>
    </main>
  );
}

function HomeLink({ label }: { label: string }) {
  return (
    <Link href="/" className="inline-flex items-center justify-center rounded-md border border-slate-300 dark:border-slate-700 px-4 py-2.5 text-sm font-medium text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors">
      {label}
    </Link>
  );
}

const STATUS_BADGE: Record<ApplicationStatus, string> = {
  PENDING: "bg-amber-50 text-amber-700 dark:bg-amber-950/40 dark:text-amber-300",
  APPROVED: "bg-emerald-50 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-300",
  REJECTED: "bg-red-50 text-red-700 dark:bg-red-950/40 dark:text-red-300",
};

/** The citizen's earlier applications, with the reviewer's reason, so a rejection is never unexplained. */
function PreviousApplications({ applications }: { applications: FirstResponderApplication[] }) {
  const t = useTranslations("becomeResponderPage");
  if (applications.length === 0) return null;

  return (
    <section className="mb-6 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-4">
      <h2 className="text-sm font-semibold text-slate-900 dark:text-slate-100">{t("previousTitle")}</h2>
      <p className="mt-0.5 text-xs text-slate-500 dark:text-slate-400">{t("previousHint")}</p>

      <ul className="mt-3 flex flex-col divide-y divide-slate-200 dark:divide-slate-800">
        {applications.map((application) => {
          const reason = application.reviewNotes?.trim();
          return (
            <li key={application.id} className="py-3 first:pt-0 last:pb-0">
              <div className="flex flex-wrap items-center justify-between gap-x-3 gap-y-1">
                <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${STATUS_BADGE[application.status]}`}>
                  {t(`status.${application.status}`)}
                </span>
                <span className="text-xs text-slate-500 dark:text-slate-400">
                  {t("submittedOn", { date: new Date(application.submittedAt).toLocaleDateString() })}
                  {application.reviewedAt && ` · ${t("reviewedOn", { date: new Date(application.reviewedAt).toLocaleDateString() })}`}
                </span>
              </div>

              {application.status === "REJECTED" && (
                <p className="mt-2 text-sm text-slate-700 dark:text-slate-300">
                  <span className="font-medium">{t("reasonLabel")}</span>{" "}
                  {reason || <span className="italic text-slate-500 dark:text-slate-400">{t("noReasonGiven")}</span>}
                </p>
              )}
            </li>
          );
        })}
      </ul>
    </section>
  );
}

function ApplyContent() {
  const t = useTranslations("becomeResponderPage");
  const { user } = useAuth();
  const { data: applications, isLoading } = useMyApplications();
  const submitApplication = useSubmitApplication();
  const { data: kyc, isLoading: kycLoading } = useKycStatus();
  const [motivation, setMotivation] = useState("");
  const [pendingFiles, setPendingFiles] = useState<File[]>([]);
  const [fileError, setFileError] = useState<string | null>(null);
  const [dragging, setDragging] = useState(false);
  const [filesRestored, setFilesRestored] = useState(false);

  // Scoped to the signed-in user so another account in the same tab never sees it.
  const draftKey = user ? `first-responder-application:${user.id}` : null;

  // Restore the text and the attached files after a refresh.
  useEffect(() => {
    if (!draftKey) return;
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setMotivation(sessionStorage.getItem(draftKey) ?? "");

    fileDraft((store) => store.get(draftKey)).then((saved) => {
      const draft = saved as FileDraft | undefined;
      if (draft && Date.now() - draft.savedAt < DRAFT_TTL_MS) {
        setPendingFiles((current) => (current.length > 0 ? current : draft.files));
      }
      setFilesRestored(true);
    });
  }, [draftKey]);

  // Keep the saved files in step with the list. Waits for the restore so an empty list can't wipe them,
  // and clears them automatically once the list is emptied (including after a successful submit).
  useEffect(() => {
    if (!draftKey || !filesRestored) return;
    void fileDraft((store) =>
      pendingFiles.length > 0 ? store.put({ files: pendingFiles, savedAt: Date.now() }, draftKey) : store.delete(draftKey),
    );
  }, [draftKey, filesRestored, pendingFiles]);

  if (!user) return <Loading />;
  if (isLoading) return <Loading />;

  const pending = applications?.find((a) => a.status === "PENDING");

  if (user.roleName !== "CITIZEN") {
    return (
      <StatusCard
        icon={Lock}
        tone="slate"
        title={t("citizenOnlyTitle")}
        actions={<HomeLink label={t("goHome")} />}
      >
        <p>{t("citizenOnly")}</p>
      </StatusCard>
    );
  }

  // Applying needs email, phone AND a verified identity.
  const contactVerified = user.emailVerified && user.phoneVerified;
  if (contactVerified && kycLoading) return <Loading />;
  if (!contactVerified || !kyc?.verified) {
    return <VerifyAccountPanel user={user} kyc={kyc} variant="apply" />;
  }

  if (pending) {
    return (
      <StatusCard icon={Clock} tone="blue" title={t("pendingTitle")} actions={<HomeLink label={t("goHome")} />}>
        <p>{t("pendingBody", { date: new Date(pending.submittedAt).toLocaleDateString() })}</p>
      </StatusCard>
    );
  }

  function describe(problem: DocumentProblem): string {
    switch (problem.reason) {
      case "type": return t("fileTypeError", { name: problem.fileName });
      case "size": return t("fileSizeError", { name: problem.fileName, max: MAX_FILE_MB });
      case "total": return t("totalSizeError", { max: MAX_TOTAL_MB });
    }
  }

  function addFiles(incoming: File[]) {
    const { accepted, problem } = checkDocuments(pendingFiles, incoming);
    setFileError(problem ? describe(problem) : null);
    if (accepted.length > 0) setPendingFiles((files) => [...files, ...accepted]);
  }

  function handleSubmit(e: FormEvent) {
    e.preventDefault();
    const formData = new FormData();
    formData.append("motivation", motivation);
    pendingFiles.forEach((f) => formData.append("files", f));
    submitApplication.mutate(formData, {
      onSuccess: () => {
        setMotivation("");
        setPendingFiles([]);
        if (draftKey) sessionStorage.removeItem(draftKey);
      },
    });
  }

  return (
    <main className="max-w-lg mx-auto px-4 py-12">
      <h1 className="text-xl font-semibold text-slate-900 dark:text-slate-100 mb-1">{t("title")}</h1>
      <p className="text-sm text-slate-500 dark:text-slate-400 mb-6">{t("subtitle")}</p>

      <PreviousApplications applications={applications?.filter((a) => a.status !== "PENDING") ?? []} />

      <form onSubmit={handleSubmit} className="flex flex-col gap-4">
        <textarea
          value={motivation}
          onChange={(e) => {
            setMotivation(e.target.value);
            if (draftKey) sessionStorage.setItem(draftKey, e.target.value);
          }}
          required
          rows={5}
          aria-label={t("motivationPlaceholder")}
          placeholder={t("motivationPlaceholder")}
          className="px-3 py-2 border border-slate-300 dark:border-slate-700 rounded-md text-sm bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100"
        />

        <div className="flex flex-col gap-1.5">
          <span className="text-sm font-medium text-slate-700 dark:text-slate-300">{t("documentsLabel")}</span>
          <label
            onDragOver={(e) => { e.preventDefault(); setDragging(true); }}
            onDragLeave={() => setDragging(false)}
            onDrop={(e) => { e.preventDefault(); setDragging(false); addFiles(Array.from(e.dataTransfer.files)); }}
            className={`cursor-pointer rounded-xl border-2 border-dashed px-4 py-6 text-center transition-colors focus-within:ring-2 focus-within:ring-blue-500 ${
              dragging
                ? "border-blue-500 bg-blue-50 dark:bg-blue-950/30"
                : "border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-900 hover:border-blue-400 dark:hover:border-blue-600"
            }`}
          >
            <input
              type="file"
              multiple
              accept={ACCEPT}
              className="sr-only"
              onChange={(e) => { addFiles(Array.from(e.target.files ?? [])); e.target.value = ""; }}
            />
            <span className="pointer-events-none flex flex-col items-center gap-1">
              <UploadCloud className="w-6 h-6 text-blue-600 dark:text-blue-400" aria-hidden="true" />
              <span className="text-sm font-medium text-slate-800 dark:text-slate-200">{t("dropPrompt")}</span>
              <span className="text-xs text-slate-500 dark:text-slate-400">{t("dropHint", { max: MAX_FILE_MB })}</span>
            </span>
          </label>
          {fileError && <p role="alert" className="text-xs text-red-600 dark:text-red-400">{fileError}</p>}
        </div>

        {pendingFiles.length > 0 && (
          <PendingDocumentGrid files={pendingFiles} onRemove={(index) => setPendingFiles((files) => files.filter((_, i) => i !== index))} />
        )}

        {submitApplication.isError && <p className="text-sm text-red-600 dark:text-red-400">{submitApplication.error instanceof Error ? submitApplication.error.message : t("submitError")}</p>}

        <button type="submit" disabled={submitApplication.isPending || pendingFiles.length === 0 || motivation.trim() === ""} className="py-2.5 cursor-pointer bg-blue-600 text-white text-sm font-medium rounded-md disabled:opacity-50">
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