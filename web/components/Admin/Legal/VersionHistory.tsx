"use client";

import { useState } from "react";
import { useLocale, useTranslations } from "next-intl";
import { useQueryClient } from "@tanstack/react-query";
import Link from "next/link";
import { fetchLegalVersion, useLegalVersions } from "@/hooks/legal/useLegal";
import { resolveText } from "@/lib/guidance/content";
import { legalSlug } from "@/lib/legal/slug";
import type { LegalContent, LegalDocumentType } from "@/types/legal";

interface VersionHistoryProps {
  type: LegalDocumentType;
  /** Loads an older version's text into the editor as a starting point for the next version. */
  onUseAsStart: (version: number, content: LegalContent) => void;
}

/** Every version ever published, newest first. Versions are immutable: they can be read, never changed. */
export default function VersionHistory({ type, onUseAsStart }: VersionHistoryProps) {
  const t = useTranslations("adminLegal");
  const locale = useLocale();
  const queryClient = useQueryClient();
  const { data, isPending } = useLegalVersions(type);
  const [busy, setBusy] = useState<number | null>(null);

  async function useVersion(version: number) {
    if (!window.confirm(t("useAsStartConfirm", { version }))) return;
    setBusy(version);
    try {
      const document = await queryClient.fetchQuery({
        queryKey: ["legal", "version", type, version],
        queryFn: () => fetchLegalVersion(type, version),
      });
      onUseAsStart(version, document.content);
    } finally {
      setBusy(null);
    }
  }

  return (
    <div className="rounded-xl border border-slate-200 bg-white p-4 dark:border-slate-800 dark:bg-slate-900">
      <div className="mb-3 flex items-center justify-between gap-3">
        <h2 className="text-base font-semibold text-slate-900 dark:text-slate-100">{t("history")}</h2>
        <Link href={`/${legalSlug(type)}`} target="_blank" className="text-sm font-medium text-blue-600 hover:underline dark:text-blue-400">
          {t("viewPublic")}
        </Link>
      </div>

      {isPending ? null : (
        <ul className="flex flex-col divide-y divide-slate-100 dark:divide-slate-800">
          {(data ?? []).map((entry) => (
            <li key={entry.version} className="flex flex-wrap items-center justify-between gap-3 py-2.5">
              <div className="min-w-0">
                <p className="text-sm font-medium text-slate-900 dark:text-slate-100">
                  {t("versionLabel", { version: entry.version })}
                  <span className="ms-2 text-xs font-normal text-slate-500 dark:text-slate-400">
                    {new Date(entry.publishedAt).toLocaleString(locale)}
                  </span>
                </p>
                <p className="text-xs text-slate-500 dark:text-slate-400">
                  {entry.requiresAcceptance ? t("reAcceptance") : t("minorChange")}
                  {entry.changeSummary && ` · ${resolveText(entry.changeSummary, locale)}`}
                </p>
              </div>
              <button
                type="button"
                disabled={busy !== null}
                onClick={() => useVersion(entry.version)}
                className="cursor-pointer text-sm font-medium text-blue-600 hover:underline disabled:cursor-default disabled:opacity-50 dark:text-blue-400"
              >
                {t("useAsStart")}
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
