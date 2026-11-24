"use client";

import { useEffect, useState } from "react";
import { useLocale, useTranslations } from "next-intl";
import { usePathname } from "next/navigation";
import { Loader2, ScrollText } from "lucide-react";
import useAuth from "@/hooks/auth/useAuth";
import { useLogout } from "@/hooks/auth/useLogout";
import { useAcceptConsent, useConsentStatus } from "@/hooks/legal/useLegal";
import { resolveText } from "@/lib/guidance/content";
import { LEGAL_PAGE_PATHS, legalSlug } from "@/lib/legal/slug";
import type { PendingConsent } from "@/types/legal";

/**
 * Blocks the whole app, for anyone signed in, until they accept the latest Terms and Privacy Policy
 * (or sign out). The two legal pages stay readable so people can see what they are agreeing to.
 */
export default function LegalConsentGate() {
  const { user } = useAuth();
  const pathname = usePathname();
  const { data } = useConsentStatus(!!user);

  const pending = data?.pending ?? [];
  if (!user || pending.length === 0 || LEGAL_PAGE_PATHS.includes(pathname)) return null;
  return <ConsentDialog pending={pending} />;
}

function ConsentDialog({ pending }: { pending: PendingConsent[] }) {
  const t = useTranslations("legal.gate");
  const locale = useLocale();
  const accept = useAcceptConsent();
  const logout = useLogout();
  const [agreed, setAgreed] = useState(false);

  // The page behind must not scroll while the prompt is up.
  useEffect(() => {
    const previous = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = previous;
    };
  }, []);

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center overflow-y-auto bg-slate-950/70 p-4 backdrop-blur-sm">
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="consent-title"
        className="my-auto flex w-full max-w-lg flex-col gap-5 rounded-2xl bg-white p-6 shadow-xl dark:bg-slate-900 sm:p-8"
      >
        <div className="flex items-start gap-3">
          <ScrollText className="mt-1 h-6 w-6 shrink-0 text-blue-600 dark:text-blue-400" aria-hidden="true" />
          <div>
            <h2 id="consent-title" className="text-xl font-bold text-slate-900 dark:text-white">{t("title")}</h2>
            <p className="mt-1 text-sm text-slate-600 dark:text-slate-300">{t("body")}</p>
          </div>
        </div>

        <ul className="flex flex-col gap-3">
          {pending.map((item) => (
            <li key={item.versionId} className="rounded-xl border border-slate-200 p-4 dark:border-slate-800">
              <div className="flex items-center justify-between gap-3">
                <p className="font-semibold text-slate-900 dark:text-white">{resolveText(item.title, locale)}</p>
                <span className="text-xs text-slate-500 dark:text-slate-400">{t("version", { version: item.version })}</span>
              </div>
              {item.changeSummary && (
                <p className="mt-2 text-sm text-slate-600 dark:text-slate-300">
                  <span className="font-medium">{t("whatChanged")}: </span>
                  {resolveText(item.changeSummary, locale)}
                </p>
              )}
              <a
                href={`/${legalSlug(item.type)}`}
                target="_blank"
                rel="noopener noreferrer"
                className="mt-2 inline-block text-sm font-medium text-blue-600 hover:underline dark:text-blue-400"
              >
                {t("read")}
              </a>
            </li>
          ))}
        </ul>

        <label className="flex cursor-pointer items-start gap-3 text-sm text-slate-700 dark:text-slate-200">
          <input type="checkbox" checked={agreed} onChange={(e) => setAgreed(e.target.checked)} className="mt-1 h-4 w-4" />
          {t("agree")}
        </label>

        {accept.isError && (
          <p role="alert" className="text-sm text-red-600 dark:text-red-400">
            {accept.error instanceof Error ? accept.error.message : t("error")}
          </p>
        )}

        <div className="flex flex-col gap-2 sm:flex-row-reverse">
          <button
            type="button"
            disabled={!agreed || accept.isPending}
            onClick={() => accept.mutate(pending.map((item) => item.versionId))}
            className="flex flex-1 cursor-pointer items-center justify-center gap-2 rounded-lg bg-blue-600 px-4 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-blue-700 disabled:cursor-default disabled:opacity-50"
          >
            {accept.isPending && <Loader2 className="h-4 w-4 animate-spin" />}
            {accept.isPending ? t("accepting") : t("accept")}
          </button>
          <button
            type="button"
            onClick={() => logout()}
            className="cursor-pointer rounded-lg px-4 py-2.5 text-sm font-medium text-slate-600 transition-colors hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-slate-800"
          >
            {t("signOut")}
          </button>
        </div>

        <p className="text-center text-xs text-slate-500 dark:text-slate-400">{t("emergency")}</p>
      </div>
    </div>
  );
}
