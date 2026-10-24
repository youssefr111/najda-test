import { getLocale, getTranslations } from "next-intl/server";
import { fetchLegalDocument } from "@/lib/legal/server";
import type { LegalDocumentType } from "@/types/legal";
import LegalDocumentView from "./LegalDocumentView";

/** A public legal page (terms or privacy), read from the backend so admins can edit it from the dashboard. */
export default async function LegalPage({ type }: { type: LegalDocumentType }) {
  const [t, locale, document] = await Promise.all([getTranslations("legal"), getLocale(), fetchLegalDocument(type)]);

  if (!document) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-slate-50 px-4 dark:bg-slate-950">
        <p className="max-w-md text-center text-slate-600 dark:text-slate-300">{t("unavailable")}</p>
      </main>
    );
  }

  const date = new Intl.DateTimeFormat(locale, { dateStyle: "long" }).format(new Date(document.publishedAt));
  return (
    <LegalDocumentView
      content={document.content}
      locale={locale}
      eyebrow={t("eyebrow")}
      meta={t("version", { version: document.version, date })}
    />
  );
}
