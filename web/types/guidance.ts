import type { Locale } from "@/lib/locale/config";
import type { IncidentCategory } from "./incident";

/** One text in every supported language, e.g. { en: "...", ar: "..." }. */
export type LocalizedText = Record<Locale, string>;

export interface GuidanceCard {
  /** Stable slug, unique across the whole document. */
  id: string;
  /** The category's main card: always listed first and opened by default. */
  general: boolean;
  /** Only show the card when the report has at least this many injured people (null = always). */
  minInjured: number | null;
  title: LocalizedText;
  steps: LocalizedText[];
  /** Optional highlighted note under the steps. */
  warning: LocalizedText | null;
}

export interface GuidanceCategory {
  category: IncidentCategory;
  cards: GuidanceCard[];
}

export interface GuidanceContent {
  disclaimer: LocalizedText;
  categories: GuidanceCategory[];
}

export interface GuidanceDocument {
  version: number;
  updatedAt: string;
  content: GuidanceContent;
}

export interface UpdateGuidanceRequest {
  /** The version the editor loaded; the server refuses the save if it has moved on. */
  baseVersion: number;
  content: GuidanceContent;
}
