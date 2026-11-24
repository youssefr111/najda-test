import { SUPPORTED_LOCALES } from "@/lib/locale/config";
import type { IncidentCategory } from "@/types/incident";
import type { GuidanceCard, GuidanceCategory, LocalizedText } from "@/types/guidance";

export const emptyText = (): LocalizedText =>
  Object.fromEntries(SUPPORTED_LOCALES.map((locale) => [locale, ""])) as LocalizedText;

export const newCard = (): GuidanceCard => ({
  id: `card-${crypto.randomUUID().slice(0, 8)}`,
  general: false,
  minInjured: null,
  title: emptyText(),
  steps: [emptyText()],
  warning: null,
});

export const newCategory = (category: IncidentCategory): GuidanceCategory => ({
  category,
  cards: [{ ...newCard(), general: true }],
});

export function replaceAt<T>(items: readonly T[], index: number, next: T): T[] {
  return items.map((item, i) => (i === index ? next : item));
}

export function removeAt<T>(items: readonly T[], index: number): T[] {
  return items.filter((_, i) => i !== index);
}

/** Swaps the item with its neighbour; a no-op at either end of the list. */
export function moveItem<T>(items: readonly T[], index: number, direction: -1 | 1): T[] {
  const target = index + direction;
  if (target < 0 || target >= items.length) return [...items];
  const next = [...items];
  [next[index], next[target]] = [next[target], next[index]];
  return next;
}
