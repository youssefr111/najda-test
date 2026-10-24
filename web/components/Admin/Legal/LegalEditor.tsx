"use client";

import { useState } from "react";
import { useLocale, useTranslations } from "next-intl";
import { Loader2, Plus } from "lucide-react";
import Loading from "@/components/ui/Loading";
import LocalizedField from "@/components/Admin/Guidance/LocalizedField";
import { usePublishLegal, useLegalDocument } from "@/hooks/legal/useLegal";
import { emptyText, moveItem, removeAt, replaceAt } from "@/lib/guidance/draft";
import { isLegalComplete, normalizeLegal, isTextBlank, newSection } from "@/lib/legal/draft";
import { LEGAL_TYPES } from "@/lib/legal/slug";
import type { LocalizedText } from "@/types/guidance";
import type { LegalContent, LegalDocument, LegalDocumentType } from "@/types/legal";
import SectionEditor from "./SectionEditor";
import VersionHistory from "./VersionHistory";

/** Terms & Conditions / Privacy Policy editor: SUPER_ADMIN only. Publishing creates a new immutable version. */
export default function LegalEditor() {
  const t = useTranslations("adminLegal");
  const [type, setType] = useState<LegalDocumentType>("TERMS");
  // An older version chosen from the history, used as the editor's starting text.
  const [override, setOverride] = useState<{ type: LegalDocumentType; version: number; content: LegalContent } | null>(null);
  const { data, isError, refetch } = useLegalDocument(type);

  const activeOverride = override?.type === type ? override : null;

  return (
    <div className="mx-auto flex max-w-4xl flex-col gap-6 px-4 py-6 sm:px-6 sm:py-8">
      <div>
        <h1 className="text-xl font-semibold text-slate-900 dark:text-slate-100 sm:text-2xl">{t("title")}</h1>
        <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">{t("subtitle")}</p>
      </div>

      <div role="tablist" className="flex gap-2">
        {LEGAL_TYPES.map((entry) => (
          <button
            key={entry}
            type="button"
            role="tab"
            aria-selected={entry === type}
            onClick={() => setType(entry)}
            className={`cursor-pointer rounded-full px-4 py-1.5 text-sm font-medium transition-colors ${
              entry === type
                ? "bg-blue-600 text-white"
                : "border border-slate-300 text-slate-700 hover:bg-slate-100 dark:border-slate-700 dark:text-slate-200 dark:hover:bg-slate-800"
            }`}
          >
            {t(`type.${entry}`)}
          </button>
        ))}
      </div>

      {isError && !data ? (
        <div className="flex flex-col items-center gap-3 py-12 text-center">
          <p role="alert" className="text-sm text-slate-600 dark:text-slate-400">{t("loadError")}</p>
          <button type="button" onClick={() => refetch()} className="cursor-pointer rounded-md bg-blue-600 px-3.5 py-2 text-sm font-medium text-white hover:bg-blue-700">{t("retry")}</button>
        </div>
      ) : !data ? (
        <Loading />
      ) : (
        <>
          <LegalForm
            key={`${type}-${data.version}-${activeOverride?.version ?? "latest"}`}
            type={type}
            latest={data}
            initial={activeOverride?.content ?? data.content}
            startedFrom={activeOverride?.version ?? null}
          />
          <VersionHistory type={type} onUseAsStart={(version, content) => setOverride({ type, version, content })} />
        </>
      )}
    </div>
  );
}

interface LegalFormProps {
  type: LegalDocumentType;
  latest: LegalDocument;
  initial: LegalContent;
  startedFrom: number | null;
}

function LegalForm({ type, latest, initial, startedFrom }: LegalFormProps) {
  const t = useTranslations("adminLegal");
  const locale = useLocale();
  const publish = usePublishLegal(type);

  const [draft, setDraft] = useState<LegalContent>(() => structuredClone(initial));
  const [summary, setSummary] = useState<LocalizedText>(emptyText);
  const [requiresAcceptance, setRequiresAcceptance] = useState(true);

  const dirty = JSON.stringify(draft) !== JSON.stringify(latest.content);
  const complete = isLegalComplete(draft);
  const subtitle = draft.subtitle ?? emptyText();

  const setSections = (sections: LegalContent["sections"]) => setDraft((current) => ({ ...current, sections }));

  function handlePublish() {
    if (!window.confirm(t(requiresAcceptance ? "publishConfirmRequired" : "publishConfirmMinor"))) return;
    publish.mutate({
      baseVersion: latest.version,
      content: normalizeLegal(draft),
      changeSummary: isTextBlank(summary) ? null : summary,
      requiresAcceptance,
    });
  }

  return (
    <div className="flex flex-col gap-6">
      <p className="text-sm text-slate-500 dark:text-slate-400">
        {t("current", { version: latest.version, date: new Date(latest.publishedAt).toLocaleString(locale) })}
        {startedFrom !== null && <span className="ms-2 font-medium text-amber-700 dark:text-amber-400">{t("startedFrom", { version: startedFrom })}</span>}
      </p>
      <p className="text-xs text-slate-500 dark:text-slate-400">{t("linkHint")}</p>

      <div className="flex flex-col gap-4 rounded-xl border border-slate-200 bg-white p-4 dark:border-slate-800 dark:bg-slate-900">
        <LocalizedField label={t("documentTitle")} value={draft.title} onChange={(next) => setDraft((c) => ({ ...c, title: next }))} />
        <LocalizedField label={t("documentSubtitle")} value={subtitle} optional onChange={(next) => setDraft((c) => ({ ...c, subtitle: next }))} />
      </div>

      {draft.sections.map((section, index) => (
        <SectionEditor
          key={section.id}
          section={section}
          number={index + 1}
          isFirst={index === 0}
          isLast={index === draft.sections.length - 1}
          onChange={(next) => setSections(replaceAt(draft.sections, index, next))}
          onMove={(direction) => setSections(moveItem(draft.sections, index, direction))}
          onRemove={() => setSections(removeAt(draft.sections, index))}
        />
      ))}

      <button
        type="button"
        onClick={() => setSections([...draft.sections, newSection()])}
        className="flex w-fit cursor-pointer items-center gap-1.5 text-sm font-medium text-blue-600 dark:text-blue-400"
      >
        <Plus className="h-4 w-4" />
        {t("addSection")}
      </button>

      <div className="sticky bottom-0 z-10 -mx-4 flex flex-col gap-4 border-t border-slate-200 bg-slate-50/95 p-4 backdrop-blur dark:border-slate-800 dark:bg-slate-950/95 sm:-mx-6 sm:px-6">
        <LocalizedField label={t("changeSummary")} value={summary} optional multiline onChange={setSummary} />
        <p className="-mt-2 text-xs text-slate-500 dark:text-slate-400">{t("changeSummaryHint")}</p>

        <label className="flex cursor-pointer items-start gap-3 text-sm text-slate-700 dark:text-slate-200">
          <input type="checkbox" checked={requiresAcceptance} onChange={(e) => setRequiresAcceptance(e.target.checked)} className="mt-1 h-4 w-4" />
          <span>
            <span className="font-medium">{t("requiresAcceptance")}</span>
            <span className="block text-xs text-slate-500 dark:text-slate-400">{t("requiresAcceptanceHint")}</span>
          </span>
        </label>

        {dirty && !complete && <p role="status" className="text-sm text-amber-700 dark:text-amber-400">{t("incomplete")}</p>}
        {publish.isError && (
          <p role="alert" className="rounded-md bg-red-50 px-3 py-2 text-sm text-red-700 dark:bg-red-950/40 dark:text-red-300">
            {publish.error instanceof Error ? publish.error.message : t("publishError")}
          </p>
        )}

        <div className="flex items-center justify-end gap-2">
          <button
            type="button"
            disabled={!dirty || !complete || publish.isPending}
            onClick={handlePublish}
            className="flex cursor-pointer items-center gap-1.5 rounded-md bg-blue-600 px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-blue-700 disabled:cursor-default disabled:opacity-50"
          >
            {publish.isPending && <Loader2 className="h-4 w-4 animate-spin" />}
            {publish.isPending ? t("publishing") : t("publish")}
          </button>
        </div>
      </div>
    </div>
  );
}
