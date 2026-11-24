import { renderInline } from "@/lib/legal/inline";
import { resolveText } from "@/lib/guidance/content";
import { LANGUAGES } from "@/lib/locale/languages";
import type { LegalBlock, LegalContent } from "@/types/legal";

interface LegalDocumentViewProps {
  content: LegalContent;
  locale: string;
  eyebrow: string;
  /** e.g. "Version 3 · effective 12 March 2026" */
  meta: string;
}

function Block({ block, locale }: { block: LegalBlock; locale: string }) {
  switch (block.type) {
    case "HEADING":
      return <h3 className="mt-2 text-base font-semibold text-slate-900 dark:text-white">{resolveText(block.text, locale)}</h3>;
    case "NOTICE":
      return (
        <p className="rounded-xl border-2 border-red-200 bg-red-50 p-4 text-red-800 dark:border-red-900 dark:bg-red-950/30 dark:text-red-300">
          {renderInline(resolveText(block.text, locale))}
        </p>
      );
    case "LIST":
      return (
        <ul className="flex list-disc flex-col gap-1.5 ps-5">
          {block.items.map((item, index) => (
            <li key={index}>{renderInline(resolveText(item, locale))}</li>
          ))}
        </ul>
      );
    default:
      return <p>{renderInline(resolveText(block.text, locale))}</p>;
  }
}

/** The legal page body. Usable from server and client components alike. */
export default function LegalDocumentView({ content, locale, eyebrow, meta }: LegalDocumentViewProps) {
  const dir = LANGUAGES.find((language) => language.id === locale)?.dir ?? "ltr";
  const subtitle = content.subtitle ? resolveText(content.subtitle, locale) : "";

  return (
    <main className="min-h-screen bg-slate-50 transition-colors dark:bg-slate-950" dir={dir}>
      <section className="bg-slate-950 py-14 text-white sm:py-20">
        <div className="mx-auto max-w-3xl px-4 text-center sm:px-6">
          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-red-400 sm:text-sm sm:tracking-[0.3em]">{eyebrow}</p>
          <h1 className="mt-4 text-3xl font-bold sm:text-5xl">{resolveText(content.title, locale)}</h1>
          {subtitle && <p className="mx-auto mt-4 max-w-xl text-slate-300">{subtitle}</p>}
          <p className="mt-4 text-xs text-slate-400">{meta}</p>
        </div>
      </section>

      <section className="mx-auto flex max-w-3xl flex-col gap-5 px-4 py-12 sm:px-6 sm:py-16">
        {content.sections.map((section) => (
          <div
            key={section.id}
            id={section.id}
            className="rounded-2xl border border-slate-200 bg-white p-6 dark:border-slate-800 dark:bg-slate-900 sm:p-8"
          >
            <h2 className="mb-3 text-lg font-bold text-slate-900 dark:text-white sm:text-xl">{resolveText(section.title, locale)}</h2>
            <div className="flex flex-col gap-3 text-sm leading-7 text-slate-600 dark:text-slate-300 sm:text-base">
              {section.blocks.map((block, index) => (
                <Block key={index} block={block} locale={locale} />
              ))}
            </div>
          </div>
        ))}
      </section>
    </main>
  );
}
