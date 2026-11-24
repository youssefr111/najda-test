import { DEFAULT_LOCALE, type Locale } from "@/lib/locale/config";
import type { IncidentCategory } from "@/types/incident";
import type { GuidanceCard, GuidanceContent, LocalizedText } from "@/types/guidance";

/** Every report category the backend knows. Add a value here when IncidentCategory gains one. */
export const INCIDENT_CATEGORIES: readonly IncidentCategory[] = ["MEDICAL", "FIRE", "POLICE"];

/** Text in the reader's language, falling back to the default language, then to nothing. */
export function resolveText(text: LocalizedText | null | undefined, locale: string): string {
  return text?.[locale as Locale] || text?.[DEFAULT_LOCALE] || "";
}

/** The cards a citizen sees for a report: matching the category and injured count, general card first. */
export function cardsFor(content: GuidanceContent, category: IncidentCategory, injuredCount: number): GuidanceCard[] {
  const cards = content.categories.find((entry) => entry.category === category)?.cards ?? [];
  const visible = cards.filter((card) => card.minInjured == null || injuredCount >= card.minInjured);
  return [...visible.filter((card) => card.general), ...visible.filter((card) => !card.general)];
}
