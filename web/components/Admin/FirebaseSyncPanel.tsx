"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { RefreshCw, UserPlus, Trash2 } from "lucide-react";
import { useFirebaseSyncReport } from "@/hooks/admin/useFirebaseSyncReport";
import { useSyncFirebaseUser, useDeleteOrphanedFirebaseUser, useDeleteOrphanedPostgresUser } from "@/hooks/admin/useFirebaseSyncActions";

export default function FirebaseSyncPanel() {
  const t = useTranslations("firebaseSync");
  const [checked, setChecked] = useState(false);
  const { data: report, isLoading, refetch, isFetching } = useFirebaseSyncReport(checked);
  const syncUser = useSyncFirebaseUser();
  const deleteFirebaseUser = useDeleteOrphanedFirebaseUser();
  const deletePostgresUser = useDeleteOrphanedPostgresUser();

  const anyError = syncUser.error ?? deleteFirebaseUser.error ?? deletePostgresUser.error;

  return (
    <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-4 flex flex-col gap-3">
      <div className="flex items-center justify-between gap-3">
        <div>
          <p className="text-sm font-medium text-slate-900 dark:text-slate-100">{t("title")}</p>
          <p className="text-xs text-slate-500 dark:text-slate-400">{t("description")}</p>
        </div>
        <button
          type="button"
          onClick={() => { setChecked(true); refetch(); }}
          disabled={isFetching}
          className="flex items-center gap-1.5 px-3 py-2 bg-slate-900 dark:bg-slate-100 text-white dark:text-slate-900 text-sm font-medium rounded-md hover:opacity-90 transition-opacity disabled:opacity-50 shrink-0"
        >
          <RefreshCw className={`w-4 h-4 ${isFetching ? "animate-spin" : ""}`} /> {t("check")}
        </button>
      </div>

      {checked && (isLoading ? (
        <p className="text-sm text-slate-500 dark:text-slate-400">{t("checking")}</p>
      ) : report ? (
        <div className="flex flex-col gap-4">
          <div>
            <p className="text-xs font-medium uppercase tracking-wide text-slate-400 dark:text-slate-500 mb-2">
              {t("firebaseOnlyLabel", { count: report.orphanedFirebaseUsers.length })}
            </p>
            {report.orphanedFirebaseUsers.length === 0 ? (
              <p className="text-sm text-slate-400 dark:text-slate-500">{t("noneFound")}</p>
            ) : (
              <div className="flex flex-col gap-1.5">
                {report.orphanedFirebaseUsers.map((u) => (
                  <div key={u.uid} className="flex items-center justify-between gap-2 p-2 border border-slate-200 dark:border-slate-700 rounded-md text-sm">
                    <span className="text-slate-900 dark:text-slate-100 truncate" dir="ltr">{u.email ?? u.uid}</span>
                    <div className="flex gap-1.5 shrink-0">
                      <button type="button" onClick={() => syncUser.mutate(u.uid)} disabled={syncUser.isPending} className="flex items-center gap-1 px-2 py-1 bg-blue-600 text-white text-xs font-medium rounded-md disabled:opacity-50">
                        <UserPlus className="w-3.5 h-3.5" /> {t("sync")}
                      </button>
                      <button type="button" onClick={() => deleteFirebaseUser.mutate(u.uid)} disabled={deleteFirebaseUser.isPending} className="flex items-center gap-1 px-2 py-1 border border-red-300 dark:border-red-800 text-red-700 dark:text-red-300 text-xs font-medium rounded-md disabled:opacity-50">
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          <div>
            <p className="text-xs font-medium uppercase tracking-wide text-slate-400 dark:text-slate-500 mb-2">
              {t("postgresOnlyLabel", { count: report.orphanedPostgresUsers.length })}
            </p>
            {report.orphanedPostgresUsers.length === 0 ? (
              <p className="text-sm text-slate-400 dark:text-slate-500">{t("noneFound")}</p>
            ) : (
              <div className="flex flex-col gap-1.5">
                {report.orphanedPostgresUsers.map((u) => (
                  <div key={u.id} className="flex items-center justify-between gap-2 p-2 border border-slate-200 dark:border-slate-700 rounded-md text-sm">
                    <span className="text-slate-900 dark:text-slate-100 truncate" dir="ltr">{u.email}</span>
                    <button type="button" onClick={() => deletePostgresUser.mutate(u.id)} disabled={deletePostgresUser.isPending} className="flex items-center gap-1 px-2 py-1 border border-red-300 dark:border-red-800 text-red-700 dark:text-red-300 text-xs font-medium rounded-md disabled:opacity-50">
                      <Trash2 className="w-3.5 h-3.5" /> {t("delete")}
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>

          {anyError && (
            <p className="text-xs text-red-600 dark:text-red-400">{anyError instanceof Error ? anyError.message : t("error")}</p>
          )}
        </div>
      ) : null)}
    </div>
  );
}