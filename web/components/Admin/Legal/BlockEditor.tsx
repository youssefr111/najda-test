"use client";

import { useTranslations } from "next-intl";
import { ArrowDown, ArrowUp, Plus, Trash2 } from "lucide-react";
import LocalizedField from "@/components/Admin/Guidance/LocalizedField";
import { emptyText, moveItem, removeAt, replaceAt } from "@/lib/guidance/draft";
import type { LegalBlock } from "@/types/legal";

interface BlockEditorProps {
  block: LegalBlock;
  isFirst: boolean;
  isLast: boolean;
  onChange: (next: LegalBlock) => void;
  onMove: (direction: -1 | 1) => void;
  onRemove: () => void;
}

export const ICON_BUTTON =
  "p-1.5 rounded-md cursor-pointer text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800 disabled:opacity-30 disabled:cursor-default transition-colors";

export default function BlockEditor({ block, isFirst, isLast, onChange, onMove, onRemove }: BlockEditorProps) {
  const t = useTranslations("adminLegal");

  return (
    <div className="flex items-start gap-2 rounded-lg border border-slate-200 bg-white p-3 dark:border-slate-800 dark:bg-slate-900">
      <div className="min-w-0 flex-1">
        <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-slate-400">{t(`block.${block.type}`)}</p>

        {block.type === "LIST" ? (
          <div className="flex flex-col gap-3">
            {block.items.map((item, index) => (
              <div key={index} className="flex items-start gap-2">
                <div className="min-w-0 flex-1">
                  <LocalizedField
                    label={t("item", { number: index + 1 })}
                    value={item}
                    multiline
                    onChange={(next) => onChange({ ...block, items: replaceAt(block.items, index, next) })}
                  />
                </div>
                <div className="mt-6 flex flex-col">
                  <button type="button" disabled={index === 0} onClick={() => onChange({ ...block, items: moveItem(block.items, index, -1) })} aria-label={t("moveUp")} className={ICON_BUTTON}><ArrowUp className="h-4 w-4" /></button>
                  <button type="button" disabled={index === block.items.length - 1} onClick={() => onChange({ ...block, items: moveItem(block.items, index, 1) })} aria-label={t("moveDown")} className={ICON_BUTTON}><ArrowDown className="h-4 w-4" /></button>
                  <button type="button" disabled={block.items.length === 1} onClick={() => onChange({ ...block, items: removeAt(block.items, index) })} aria-label={t("removeItem")} className={`${ICON_BUTTON} hover:text-red-600`}><Trash2 className="h-4 w-4" /></button>
                </div>
              </div>
            ))}
            <button
              type="button"
              onClick={() => onChange({ ...block, items: [...block.items, emptyText()] })}
              className="flex w-fit cursor-pointer items-center gap-1.5 text-sm font-medium text-blue-600 dark:text-blue-400"
            >
              <Plus className="h-4 w-4" />
              {t("addItem")}
            </button>
          </div>
        ) : (
          <LocalizedField
            label={t(`block.${block.type}`)}
            value={block.text}
            multiline={block.type !== "HEADING"}
            onChange={(next) => onChange({ ...block, text: next })}
          />
        )}
      </div>

      <div className="flex flex-col">
        <button type="button" disabled={isFirst} onClick={() => onMove(-1)} aria-label={t("moveUp")} className={ICON_BUTTON}><ArrowUp className="h-4 w-4" /></button>
        <button type="button" disabled={isLast} onClick={() => onMove(1)} aria-label={t("moveDown")} className={ICON_BUTTON}><ArrowDown className="h-4 w-4" /></button>
        <button type="button" onClick={() => window.confirm(t("removeBlockConfirm")) && onRemove()} aria-label={t("removeBlock")} className={`${ICON_BUTTON} hover:text-red-600`}><Trash2 className="h-4 w-4" /></button>
      </div>
    </div>
  );
}
