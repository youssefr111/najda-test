import { legalSlug } from "./slug";
import type { LegalDocument, LegalDocumentType } from "@/types/legal";

const API_BASE_URL = process.env.NEXT_PUBLIC_API_BASE_URL;

/**
 * Reads the current legal document on the server, so the public page is real HTML that crawlers
 * and app-store reviewers can read. Cached for a minute: an admin's publish appears almost at once.
 * Returns null instead of throwing, so the page can show a friendly message.
 */
export async function fetchLegalDocument(type: LegalDocumentType): Promise<LegalDocument | null> {
  try {
    const response = await fetch(`${API_BASE_URL}/api/legal/documents/${legalSlug(type)}`, {
      next: { revalidate: 60 },
    });
    return response.ok ? ((await response.json()) as LegalDocument) : null;
  } catch {
    return null;
  }
}
