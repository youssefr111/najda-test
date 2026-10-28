"use client";

import { useTranslations } from "next-intl";
import { ArrowDown, ArrowUp, Plus, Trash2 } from "lucide-react";
import LocalizedField from "@/components/Admin/Guidance/LocalizedField";
import { moveItem, removeAt, replaceAt } from "@/lib/guidance/draft";
import { newBlock } from "@/lib/legal/draft";
import type { LegalBlockType, LegalSection } from "@/types/legal";
import BlockEditor, { ICON_BUTTON } from "./BlockEditor";

interface SectionEditorProps {
  section: LegalSection;
  number: number;
  isFirst: boolean;
  isLast: boolean;
  onChange: (next: LegalSection) => void;
  onMove: (direction: -1 | 1) => void;
  onRemove: () => void;
}

const BLOCK_TYPES: readonly LegalBlockType[] = ["PARAGRAPH", "HEADING", "LIST", "NOTICE"];

export default function SectionEditor({ section, number, isFirst, isLast, onChange, onMove, onRemove }: SectionEditorProps) {
  const t = useTranslations("adminLegal");
  const { blocks } = section;
  const setBlocks = (next: LegalSection["blocks"]) => onChange({ ...section, blocks: next });

  return (
    <section className="flex flex-col gap-4 rounded-xl border border-slate-200 bg-slate-50 p-4 dark:border-slate-800 dark:bg-slate-950/40">
      <div className="flex items-center justify-between gap-3">
        <h2 className="text-base font-semibold text-slate-900 dark:text-slate-100">{t("section", { number })}</h2>
        <div className="flex items-center">
          <button type="button" disabled={isFirst} onClick={() => onMove(-1)} aria-label={t("moveUp")} className={ICON_BUTTON}><ArrowUp className="h-4 w-4" /></button>
          <button type="button" disabled={isLast} onClick={() => onMove(1)} aria-label={t("moveDown")} className={ICON_BUTTON}><ArrowDown className="h-4 w-4" /></button>
          <button type="button" onClick={() => window.confirm(t("removeSectionConfirm")) && onRemove()} aria-label={t("removeSection")} className={`${ICON_BUTTON} hover:text-red-600`}><Trash2 className="h-4 w-4" /></button>
        </div>
      </div>

      <LocalizedField label={t("sectionTitle")} value={section.title} onChange={(next) => onChange({ ...section, title: next })} />

      <div className="flex flex-col gap-2">
        {blocks.map((block, index) => (
          <BlockEditor
            key={index}
            block={block}
            isFirst={index === 0}
            isLast={index === blocks.length - 1}
            onChange={(next) => setBlocks(replaceAt(blocks, index, next))}
            onMove={(direction) => setBlocks(moveItem(blocks, index, direction))}
            onRemove={() => setBlocks(removeAt(blocks, index))}
          />
        ))}
      </div>

      <div className="flex flex-wrap items-center gap-2">
        {BLOCK_TYPES.map((type) => (
          <button
            key={type}
            type="button"
            onClick={() => setBlocks([...blocks, newBlock(type)])}
            className="flex cursor-pointer items-center gap-1.5 rounded-full border border-slate-300 px-3 py-1.5 text-sm text-slate-700 transition-colors hover:bg-slate-100 dark:border-slate-700 dark:text-slate-200 dark:hover:bg-slate-800"
          >
            <Plus className="h-4 w-4" />
            {t(`add.${type}`)}
          </button>
        ))}
      </div>
    </section>
  );
}
