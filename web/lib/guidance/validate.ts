import type { GuidanceContent, LocalizedText } from "@/types/guidance";

const isFilled = (text: LocalizedText): boolean => Object.values(text).every((value) => value.trim() !== "");
const isBlank = (text: LocalizedText): boolean => Object.values(text).every((value) => value.trim() === "");

/**
 * Quick completeness check so Save can be disabled with a clear hint. The server is still the
 * authority and re-validates everything (limits, unique ids, duplicate categories, ...).
 */
export function isContentComplete(content: GuidanceContent): boolean {
  return (
    isFilled(content.disclaimer) &&
    content.categories.every((category) =>
      category.cards.every(
        (card) =>
          isFilled(card.title) &&
          card.steps.length > 0 &&
          card.steps.every(isFilled) &&
          (card.warning === null || isFilled(card.warning)),
      ),
    )
  );
}

/** What gets sent: an untouched (all-blank) warning means "no warning". */
export function normalizeContent(content: GuidanceContent): GuidanceContent {
  return {
    ...content,
    categories: content.categories.map((category) => ({
      ...category,
      cards: category.cards.map((card) => ({
        ...card,
        warning: card.warning && !isBlank(card.warning) ? card.warning : null,
      })),
    })),
  };
}
