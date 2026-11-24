import type { LegalDocumentType } from "@/types/legal";

export const LEGAL_TYPES: readonly LegalDocumentType[] = ["TERMS", "PRIVACY"];

/** The lowercase form used in API paths, e.g. TERMS -> "terms". */
export const legalSlug = (type: LegalDocumentType): string => type.toLowerCase();

/** Public pages that must stay readable while the acceptance prompt is up. */
export const LEGAL_PAGE_PATHS: readonly string[] = ["/terms", "/privacy"];
