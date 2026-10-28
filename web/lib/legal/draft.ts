import { emptyText } from "@/lib/guidance/draft";
import type { LegalBlock, LegalBlockType, LegalContent, LegalSection } from "@/types/legal";
import type { LocalizedText } from "@/types/guidance";

const shortId = () => crypto.randomUUID().slice(0, 8);

export function newBlock(type: LegalBlockType): LegalBlock {
  return type === "LIST" ? { type, items: [emptyText()] } : { type, text: emptyText() };
}

export const newSection = (): LegalSection => ({
  id: `section-${shortId()}`,
  title: emptyText(),
  blocks: [newBlock("PARAGRAPH")],
});

const isFilled = (text: LocalizedText): boolean => Object.values(text).every((value) => value.trim() !== "");
export const isTextBlank = (text: LocalizedText): boolean => Object.values(text).every((value) => value.trim() === "");

const isBlockComplete = (block: LegalBlock): boolean =>
  block.type === "LIST" ? block.items.length > 0 && block.items.every(isFilled) : isFilled(block.text);

/**
 * Quick completeness check so Publish can be disabled with a clear hint. The server is still the
 * authority and re-validates everything (limits, unique ids, link targets, ...).
 */
export function isLegalComplete(content: LegalContent): boolean {
  return (
    isFilled(content.title) &&
    (!content.subtitle || isTextBlank(content.subtitle) || isFilled(content.subtitle)) &&
    content.sections.length > 0 &&
    content.sections.every(
      (section) => isFilled(section.title) && section.blocks.length > 0 && section.blocks.every(isBlockComplete),
    )
  );
}

/** What gets sent: an untouched (all-blank) subtitle means "no subtitle". */
export function normalizeLegal(content: LegalContent): LegalContent {
  return { ...content, subtitle: content.subtitle && !isTextBlank(content.subtitle) ? content.subtitle : null };
}

