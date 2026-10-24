"use client";

import { useState } from "react";
import { useLocale, useTranslations } from "next-intl";
import { ArrowDown, ArrowUp, ChevronDown, Plus, Trash2 } from "lucide-react";
import { resolveText } from "@/lib/guidance/content";
import { emptyText, moveItem, removeAt, replaceAt } from "@/lib/guidance/draft";
import type { GuidanceCard } from "@/types/guidance";
import LocalizedField from "./LocalizedField";

interface CardEditorProps {
  card: GuidanceCard;
  isFirst: boolean;
  isLast: boolean;
  onChange: (next: GuidanceCard) => void;
  onMove: (direction: -1 | 1) => void;
  onRemove: () => void;
}

const ICON_BUTTON =
  "p-1.5 rounded-md cursor-pointer text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800 disabled:opacity-30 disabled:cursor-default transition-colors";

export default function CardEditor({ card, isFirst, isLast, onChange, onMove, onRemove }: CardEditorProps) {
  const t = useTranslations("adminGuidance");
  const locale = useLocale();
  const [open, setOpen] = useState(false);

  const title = resolveText(card.title, locale) || t("untitledCard");

  return (
    <div className="rounded-lg border border-slate-200 bg-white dark:border-slate-800 dark:bg-slate-900">
      <div className="flex items-center gap-2 px-3 py-2">
        <button
          type="button"
          onClick={() => setOpen((value) => !value)}
          aria-expanded={open}
          className="flex min-w-0 flex-1 cursor-pointer items-center gap-2 text-start"
        >
          <ChevronDown className={`h-4 w-4 shrink-0 text-slate-400 transition-transform ${open ? "rotate-180" : ""}`} aria-hidden="true" />
          <span className="truncate text-sm font-medium text-slate-900 dark:text-slate-100">{title}</span>
          {card.general && (
            <span className="shrink-0 rounded-full bg-blue-50 px-2 py-0.5 text-xs font-medium text-blue-700 dark:bg-blue-950/40 dark:text-blue-300">{t("general")}</span>
          )}
          {card.minInjured != null && (
            <span className="shrink-0 rounded-full bg-slate-100 px-2 py-0.5 text-xs text-slate-600 dark:bg-slate-800 dark:text-slate-300">
              {t("minInjuredBadge", { count: card.minInjured })}
            </span>
          )}
        </button>
        <button type="button" onClick={() => onMove(-1)} disabled={isFirst} aria-label={t("moveUp")} className={ICON_BUTTON}><ArrowUp className="h-4 w-4" /></button>
        <button type="button" onClick={() => onMove(1)} disabled={isLast} aria-label={t("moveDown")} className={ICON_BUTTON}><ArrowDown className="h-4 w-4" /></button>
        <button
          type="button"
          onClick={() => window.confirm(t("removeCardConfirm")) && onRemove()}
          aria-label={t("removeCard")}
          className={`${ICON_BUTTON} hover:text-red-600`}
        >
          <Trash2 className="h-4 w-4" />
        </button>
      </div>

      {open && (
        <div className="flex flex-col gap-4 border-t border-slate-100 p-4 dark:border-slate-800">
          <div className="flex flex-wrap items-end gap-x-6 gap-y-3">
            <label className="flex cursor-pointer items-center gap-2 text-sm text-slate-700 dark:text-slate-300">
              <input type="checkbox" checked={card.general} onChange={(e) => onChange({ ...card, general: e.target.checked })} />
              {t("generalCard")}
            </label>
            <label className="flex flex-col gap-1">
              <span className="text-xs text-slate-500 dark:text-slate-400">{t("minInjured")}</span>
              <input
                type="number"
                min={1}
                max={50}
                value={card.minInjured ?? ""}
                placeholder={t("always")}
                onChange={(e) => onChange({ ...card, minInjured: e.target.value === "" ? null : Number(e.target.value) })}
                className="w-28 rounded-md border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100"
              />
            </label>
          </div>

          <LocalizedField label={t("cardTitle")} value={card.title} onChange={(next) => onChange({ ...card, title: next })} />

          <div className="flex flex-col gap-3">
            <p className="text-sm font-medium text-slate-700 dark:text-slate-300">{t("steps")}</p>
            {card.steps.map((step, index) => (
              <div key={index} className="flex items-start gap-2">
                <span className="mt-8 flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-slate-200 text-xs font-semibold text-slate-700 dark:bg-slate-700 dark:text-slate-200">{index + 1}</span>
                <div className="min-w-0 flex-1">
                  <LocalizedField
                    label={t("stepLabel", { number: index + 1 })}
                    value={step}
                    multiline
                    onChange={(next) => onChange({ ...card, steps: replaceAt(card.steps, index, next) })}
                  />
                </div>
                <div className="mt-6 flex flex-col">
                  <button type="button" disabled={index === 0} onClick={() => onChange({ ...card, steps: moveItem(card.steps, index, -1) })} aria-label={t("moveUp")} className={ICON_BUTTON}><ArrowUp className="h-4 w-4" /></button>
                  <button type="button" disabled={index === card.steps.length - 1} onClick={() => onChange({ ...card, steps: moveItem(card.steps, index, 1) })} aria-label={t("moveDown")} className={ICON_BUTTON}><ArrowDown className="h-4 w-4" /></button>
                  <button type="button" disabled={card.steps.length === 1} onClick={() => onChange({ ...card, steps: removeAt(card.steps, index) })} aria-label={t("removeStep")} className={`${ICON_BUTTON} hover:text-red-600`}><Trash2 className="h-4 w-4" /></button>
                </div>
              </div>
            ))}
            <button
              type="button"
              onClick={() => onChange({ ...card, steps: [...card.steps, emptyText()] })}
              className="flex w-fit cursor-pointer items-center gap-1.5 text-sm font-medium text-blue-600 dark:text-blue-400"
            >
              <Plus className="h-4 w-4" />
              {t("addStep")}
            </button>
          </div>

          {card.warning ? (
            <div className="flex flex-col gap-2">
              <LocalizedField label={t("warning")} value={card.warning} multiline onChange={(next) => onChange({ ...card, warning: next })} />
              <button type="button" onClick={() => onChange({ ...card, warning: null })} className="w-fit cursor-pointer text-sm text-slate-500 hover:text-red-600">
                {t("removeWarning")}
              </button>
            </div>
          ) : (
            <button type="button" onClick={() => onChange({ ...card, warning: emptyText() })} className="flex w-fit cursor-pointer items-center gap-1.5 text-sm font-medium text-blue-600 dark:text-blue-400">
              <Plus className="h-4 w-4" />
              {t("addWarning")}
            </button>
          )}
        </div>
      )}
    </div>
  );
}
