"use client";

import { useState } from "react";
import { useLocale, useTranslations } from "next-intl";
import { Loader2, Plus } from "lucide-react";
import Loading from "@/components/ui/Loading";
import { useGuidance } from "@/hooks/guidance/useGuidance";
import { useSaveGuidance } from "@/hooks/guidance/useSaveGuidance";
import { categoryLabel } from "@/lib/dispatch/format";
import { INCIDENT_CATEGORIES } from "@/lib/guidance/content";
import { newCategory, removeAt, replaceAt } from "@/lib/guidance/draft";
import { isContentComplete, normalizeContent } from "@/lib/guidance/validate";
import type { IncidentCategory } from "@/types/incident";
import type { GuidanceContent, GuidanceDocument } from "@/types/guidance";
import CategorySection from "./CategorySection";
import LocalizedField from "./LocalizedField";

/** Loads the latest guidance, then hands it to the editor. */
export default function GuidanceEditor() {
  const t = useTranslations("adminGuidance");
  const { data, isError, refetch } = useGuidance({ fresh: true });

  if (isError && !data) {
    return (
      <div className="mx-auto flex max-w-3xl flex-col items-center gap-3 px-4 py-16 text-center">
        <p role="alert" className="text-sm text-slate-600 dark:text-slate-400">{t("loadError")}</p>
        <button type="button" onClick={() => refetch()} className="cursor-pointer rounded-md bg-blue-600 px-3.5 py-2 text-sm font-medium text-white hover:bg-blue-700">{t("retry")}</button>
      </div>
    );
  }
  if (!data) return <Loading />;

  // Keyed by version: after a save (or a reload) the editor restarts from what the server holds.
  return <GuidanceForm key={data.version} document={data} />;
}

function GuidanceForm({ document }: { document: GuidanceDocument }) {
  const t = useTranslations("adminGuidance");
  const tEnums = useTranslations("enums");
  const locale = useLocale();
  const { refetch } = useGuidance({ fresh: true });
  const save = useSaveGuidance();

  const [draft, setDraft] = useState<GuidanceContent>(() => structuredClone(document.content));

  const dirty = JSON.stringify(draft) !== JSON.stringify(document.content);
  const complete = isContentComplete(draft);
  const missing = INCIDENT_CATEGORIES.filter((category) => !draft.categories.some((entry) => entry.category === category));

  const setCategories = (categories: GuidanceContent["categories"]) => setDraft((current) => ({ ...current, categories }));

  function handleSave() {
    save.mutate({ baseVersion: document.version, content: normalizeContent(draft) });
  }

  return (
    <div className="mx-auto flex max-w-4xl flex-col gap-6 px-4 py-6 sm:px-6 sm:py-8">
      <div className="sticky top-0 z-10 -mx-4 flex flex-wrap items-center justify-between gap-3 border-b border-slate-200 bg-slate-50/95 px-4 py-3 backdrop-blur sm:-mx-6 sm:px-6 dark:border-slate-800 dark:bg-slate-950/95">
        <div>
          <h1 className="text-xl font-semibold text-slate-900 sm:text-2xl dark:text-slate-100">{t("title")}</h1>
          <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
            {t("version", { version: document.version, date: new Date(document.updatedAt).toLocaleString(locale) })}
          </p>
        </div>
        <div className="flex items-center gap-2">
          {dirty && <span className="text-xs text-amber-700 dark:text-amber-400">{t("unsaved")}</span>}
          <button
            type="button"
            disabled={!dirty || save.isPending}
            onClick={() => setDraft(structuredClone(document.content))}
            className="cursor-pointer rounded-md px-3 py-2 text-sm text-slate-600 hover:bg-slate-100 disabled:cursor-default disabled:opacity-40 dark:text-slate-300 dark:hover:bg-slate-800"
          >
            {t("discard")}
          </button>
          <button
            type="button"
            disabled={!dirty || !complete || save.isPending}
            onClick={handleSave}
            className="flex cursor-pointer items-center gap-1.5 rounded-md bg-blue-600 px-3.5 py-2 text-sm font-medium text-white transition-colors hover:bg-blue-700 disabled:cursor-default disabled:opacity-50"
          >
            {save.isPending && <Loader2 className="h-4 w-4 animate-spin" />}
            {save.isPending ? t("saving") : t("save")}
          </button>
        </div>
      </div>

      <p className="text-sm text-slate-500 dark:text-slate-400">{t("subtitle")}</p>

      {dirty && !complete && <p role="status" className="text-sm text-amber-700 dark:text-amber-400">{t("incomplete")}</p>}
      {save.isError && (
        <div role="alert" className="flex flex-wrap items-center gap-3 rounded-md bg-red-50 px-3 py-2 text-sm text-red-700 dark:bg-red-950/40 dark:text-red-300">
          <span>{save.error instanceof Error ? save.error.message : t("saveError")}</span>
          {save.error instanceof Error && "status" in save.error && save.error.status === 409 && (
            <button type="button" onClick={() => refetch()} className="cursor-pointer font-medium underline">{t("reload")}</button>
          )}
        </div>
      )}

      <div className="rounded-xl border border-slate-200 bg-white p-4 dark:border-slate-800 dark:bg-slate-900">
        <LocalizedField
          label={t("disclaimer")}
          value={draft.disclaimer}
          multiline
          onChange={(next) => setDraft((current) => ({ ...current, disclaimer: next }))}
        />
      </div>

      {draft.categories.map((category, index) => (
        <CategorySection
          key={category.category}
          category={category}
          onChange={(next) => setCategories(replaceAt(draft.categories, index, next))}
          onRemove={() => setCategories(removeAt(draft.categories, index))}
        />
      ))}

      {missing.length > 0 && (
        <div className="flex flex-wrap items-center gap-2">
          <span className="text-sm text-slate-500 dark:text-slate-400">{t("addCategory")}</span>
          {missing.map((category: IncidentCategory) => (
            <button
              key={category}
              type="button"
              onClick={() => setCategories([...draft.categories, newCategory(category)])}
              className="flex cursor-pointer items-center gap-1.5 rounded-full border border-slate-300 px-3 py-1.5 text-sm text-slate-700 transition-colors hover:bg-slate-100 dark:border-slate-700 dark:text-slate-200 dark:hover:bg-slate-800"
            >
              <Plus className="h-4 w-4" />
              {categoryLabel(tEnums, category)}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
