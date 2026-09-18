"use client";

import { useState } from "react";
import { useAllApplications } from "@/hooks/applications/useAllApplications";
import { useApproveApplication } from "@/hooks/applications/useApproveApplication";
import { useRejectApplication } from "@/hooks/applications/useRejectApplication";
import type { FirstResponderApplication, ApplicationStatus } from "@/types/firstResponderApplication";
import { UploadedDocumentGrid } from "@/components/Shared/DocumentTileGrid";

const STATUS_BADGE: Record<ApplicationStatus, string> = {
  PENDING: "bg-amber-50 text-amber-700 dark:bg-amber-950/40 dark:text-amber-300",
  APPROVED: "bg-emerald-50 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-300",
  REJECTED: "bg-slate-100 text-slate-500 dark:bg-slate-800 dark:text-slate-400",
};

export default function ApplicationsFeed() {
  const { data: applications, isLoading } = useAllApplications();
  const [filter, setFilter] = useState<ApplicationStatus | "all">("PENDING");

  const filtered = (applications ?? []).filter((a) => filter === "all" || a.status === filter);

  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 md:px-8 py-6 sm:py-8 flex flex-col gap-6">
      <div>
        <h1 className="text-xl sm:text-2xl font-semibold text-slate-900 dark:text-slate-100">First Responder Applications</h1>
        <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">Citizens applying to become a First Responder.</p>
      </div>

      <div className="flex gap-2">
        {(["PENDING", "APPROVED", "REJECTED", "all"] as const).map((s) => (
          <button
            key={s}
            type="button"
            onClick={() => setFilter(s)}
            className={`px-3 py-1.5 rounded-full text-xs font-medium transition-colors ${filter === s ? "bg-slate-900 text-white dark:bg-slate-100 dark:text-slate-900" : "bg-slate-100 text-slate-600 hover:bg-slate-200 dark:bg-slate-800 dark:text-slate-300"}`}
          >
            {s === "all" ? "All" : s.charAt(0) + s.slice(1).toLowerCase()}
          </button>
        ))}
      </div>

      {isLoading ? (
        <p className="text-sm text-slate-500 dark:text-slate-400">Loading…</p>
      ) : filtered.length === 0 ? (
        <p className="text-sm text-slate-500 dark:text-slate-400">No applications here.</p>
      ) : (
        <div className="flex flex-col gap-3">
          {filtered.map((a) => <ApplicationCard key={a.id} application={a} />)}
        </div>
      )}
    </div>
  );
}

function ApplicationCard({ application }: { application: FirstResponderApplication }) {
  const approve = useApproveApplication();
  const reject = useRejectApplication();
  const [rejecting, setRejecting] = useState(false);
  const [reason, setReason] = useState("");

  return (
    <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-4 flex flex-col gap-3">
      <div className="flex items-center justify-between">
        <p className="text-sm font-medium text-slate-900 dark:text-slate-100">{application.citizenName}</p>
        <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${STATUS_BADGE[application.status]}`}>{application.status}</span>
      </div>
      <p className="text-sm text-slate-700 dark:text-slate-300">{application.motivation || <span className="italic text-slate-400">No motivation provided.</span>}</p>

      {application.documents.length > 0 && <UploadedDocumentGrid documents={application.documents} />}

      <p className="text-xs text-slate-400 dark:text-slate-500">Submitted {new Date(application.submittedAt).toLocaleString()}</p>
      {application.reviewNotes && <p className="text-xs text-slate-500 dark:text-slate-400">Note: {application.reviewNotes}</p>}

      {application.status === "PENDING" && (
        <div className="flex flex-col gap-2 pt-2 border-t border-slate-100 dark:border-slate-800">
          {rejecting ? (
            <div className="flex gap-2">
              <input value={reason} onChange={(e) => setReason(e.target.value)} placeholder="Reason (optional)" className="flex-1 px-2 py-1.5 text-sm border border-slate-300 dark:border-slate-700 rounded-md bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100" />
              <button onClick={() => reject.mutate({ applicationId: application.id, reason }, { onSuccess: () => setRejecting(false) })} className="px-3 py-1.5 bg-red-600 text-white text-xs font-medium rounded-md">Confirm reject</button>
              <button onClick={() => setRejecting(false)} className="text-xs text-slate-500 dark:text-slate-400">Cancel</button>
            </div>
          ) : (
            <div className="flex gap-2">
              <button onClick={() => approve.mutate(application.id)} disabled={approve.isPending} className="px-3 py-1.5 bg-emerald-600 text-white text-xs font-medium rounded-md disabled:opacity-50">
                {approve.isPending ? "…" : "Approve"}
              </button>
              <button onClick={() => setRejecting(true)} className="px-3 py-1.5 border border-slate-300 dark:border-slate-700 text-slate-700 dark:text-slate-200 text-xs font-medium rounded-md">Reject</button>
            </div>
          )}
        </div>
      )}
      {application.documents.length === 0 && (
        <p className="text-xs text-amber-600 dark:text-amber-400 mb-1.5">No supporting documents attached — this predates the required-document rule.</p>
      )}
    </div>
  );
}