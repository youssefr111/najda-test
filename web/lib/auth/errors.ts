import { mapFirebaseAuthError } from "./error-messages";
import type { useTranslations } from "next-intl";

type ErrorTranslator = ReturnType<typeof useTranslations<"auth.errors">>;

// Raw Error messages (thrown by our own backend, or by establishSession)
// fall through untranslated -- those are free text, not Firebase codes,
// and genuinely can't be mapped here. Fully closing that gap means the
// backend itself returning locale-aware messages, a separate feature.
export function resolveAuthError(err: unknown, t: ErrorTranslator): string {
  const code = (err as { code?: string })?.code;

  if (code) {
    return mapFirebaseAuthError(code, t);
  }

  if (err instanceof Error) {
    return err.message;
  }

  return t("generic");
}