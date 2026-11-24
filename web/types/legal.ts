import type { LocalizedText } from "./guidance";

export type LegalDocumentType = "TERMS" | "PRIVACY";

export type LegalBlock =
  | { type: "HEADING" | "PARAGRAPH" | "NOTICE"; text: LocalizedText }
  | { type: "LIST"; items: LocalizedText[] };

export type LegalBlockType = LegalBlock["type"];

export interface LegalSection {
  /** Stable slug, unique within the document. */
  id: string;
  title: LocalizedText;
  blocks: LegalBlock[];
}

export interface LegalContent {
  title: LocalizedText;
  subtitle?: LocalizedText | null;
  sections: LegalSection[];
}

export interface LegalDocument {
  type: LegalDocumentType;
  version: number;
  publishedAt: string;
  requiresAcceptance: boolean;
  content: LegalContent;
}

export interface LegalVersionSummary {
  version: number;
  publishedAt: string;
  requiresAcceptance: boolean;
  changeSummary: LocalizedText | null;
}

export interface PublishLegalRequest {
  /** The latest version the editor started from; the server refuses the publish if it has moved on. */
  baseVersion: number;
  content: LegalContent;
  changeSummary: LocalizedText | null;
  /** A material change: every user must accept it again before continuing. */
  requiresAcceptance: boolean;
}

/** A document the signed-in person still has to accept (always the latest version). */
export interface PendingConsent {
  type: LegalDocumentType;
  versionId: number;
  version: number;
  title: LocalizedText;
  changeSummary: LocalizedText | null;
  publishedAt: string;
}

export interface ConsentStatus {
  pending: PendingConsent[];
}
