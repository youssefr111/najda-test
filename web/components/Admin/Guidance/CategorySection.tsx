"use client";

import { useTranslations } from "next-intl";
import { Plus, Trash2 } from "lucide-react";
import { categoryLabel } from "@/lib/dispatch/format";
import { moveItem, newCard, removeAt, replaceAt } from "@/lib/guidance/draft";
import type { GuidanceCard, GuidanceCategory } from "@/types/guidance";
import CardEditor from "./CardEditor";

interface CategorySectionProps {
  category: GuidanceCategory;
  onChange: (next: GuidanceCategory) => void;
  onRemove: () => void;
}

export default function CategorySection({ category, onChange, onRemove }: CategorySectionProps) {
  const t = useTranslations("adminGuidance");
  const tEnums = useTranslations("enums");
  const { cards } = category;

  const setCards = (next: GuidanceCard[]) => onChange({ ...category, cards: next });

  /** Only one card per category can be "general", so choosing a new one clears the old one. */
  function updateCard(index: number, next: GuidanceCard) {
    const updated = replaceAt(cards, index, next);
    setCards(next.general && !cards[index].general ? updated.map((card, i) => (i === index ? card : { ...card, general: false })) : updated);
  }

  return (
    <section className="flex flex-col gap-3 rounded-xl border border-slate-200 bg-slate-50 p-4 dark:border-slate-800 dark:bg-slate-950/40">
      <div className="flex items-center justify-between gap-3">
        <h2 className="text-base font-semibold text-slate-900 dark:text-slate-100">
          {categoryLabel(tEnums, category.category)}
          <span className="ms-2 text-sm font-normal text-slate-500 dark:text-slate-400">{t("cardCount", { count: cards.length })}</span>
        </h2>
        <button
          type="button"
          onClick={() => window.confirm(t("removeCategoryConfirm")) && onRemove()}
          className="flex cursor-pointer items-center gap-1.5 text-sm text-slate-500 transition-colors hover:text-red-600"
        >
          <Trash2 className="h-4 w-4" />
          {t("removeCategory")}
        </button>
      </div>

      <div className="flex flex-col gap-2">
        {cards.map((card, index) => (
          <CardEditor
            key={card.id}
            card={card}
            isFirst={index === 0}
            isLast={index === cards.length - 1}
            onChange={(next) => updateCard(index, next)}
            onMove={(direction) => setCards(moveItem(cards, index, direction))}
            onRemove={() => setCards(removeAt(cards, index))}
          />
        ))}
      </div>

      <button
        type="button"
        onClick={() => setCards([...cards, newCard()])}
        className="flex w-fit cursor-pointer items-center gap-1.5 text-sm font-medium text-blue-600 dark:text-blue-400"
      >
        <Plus className="h-4 w-4" />
        {t("addCard")}
      </button>
    </section>
  );
}
