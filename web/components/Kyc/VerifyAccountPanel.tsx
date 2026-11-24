"use client";

import Link from "next/link";
import { useTranslations } from "next-intl";
import { Check, Phone, ShieldCheck, X } from "lucide-react";
import type { User } from "@/types/user";
import type { KycState } from "@/lib/kyc/kyc";

type Variant = "apply" | "report";

function RequirementRow({ done, label, status }: { done: boolean; label: string; status: string }) {
  const tone = done
    ? "bg-emerald-100 text-emerald-600 dark:bg-emerald-950/40 dark:text-emerald-400"
    : "bg-amber-100 text-amber-600 dark:bg-amber-950/40 dark:text-amber-400";

  return (
    <li className="flex items-center justify-between gap-3 rounded-lg border border-slate-200 dark:border-slate-700 px-3 py-2.5 text-sm">
      <span className="flex items-center gap-2.5 text-slate-700 dark:text-slate-200">
        <span className={`flex h-5 w-5 items-center justify-center rounded-full ${tone}`}>
          {done ? <Check className="h-3 w-3" aria-hidden="true" /> : <X className="h-3 w-3" aria-hidden="true" />}
        </span>
        {label}
      </span>
      <span className={`text-xs font-medium ${done ? "text-emerald-600 dark:text-emerald-400" : "text-amber-600 dark:text-amber-400"}`}>{status}</span>
    </li>
  );
}

/**
 * "Verify your account first": what is still missing, with a link to the Account page where each step is done.
 * Shared by the responder application ("apply": email, phone, identity) and the emergency screen
 * ("report": phone, plus identity when the server requires it) so both read the same.
 */
export default function VerifyAccountPanel({ user, kyc, variant }: { user: User; kyc: KycState | undefined; variant: Variant }) {
  const t = useTranslations("verifyAccount");
  const tKyc = useTranslations("kyc");

  const identityShown = variant === "apply" || !!kyc?.required;
  const requirements = [
    { key: "email", label: t("emailStep"), done: user.emailVerified },
    { key: "phone", label: t("phoneStep"), done: user.phoneVerified },
    ...(identityShown ? [{ key: "identity", label: t("identityStep"), done: !!kyc?.verified }] : []),
  ];
  const body = variant === "apply" ? "bodyApply" : identityShown ? "bodyReportBoth" : "bodyReportContact";

  return (
    <div className="flex items-center justify-center px-4 py-10">
      <section className="w-full max-w-md rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-6 sm:p-8 text-center shadow-sm">
        <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-amber-100 text-amber-600 dark:bg-amber-950/40 dark:text-amber-400">
          <ShieldCheck className="h-7 w-7" aria-hidden="true" />
        </div>
        <h1 className="mt-5 text-xl sm:text-2xl font-semibold text-slate-900 dark:text-slate-100">{t("title")}</h1>
        <p className="mt-2 text-sm sm:text-base leading-relaxed text-slate-500 dark:text-slate-400">
          {t.rich(body, {
            account: (chunks) => <span className="font-medium text-slate-700 dark:text-slate-200">{chunks}</span>,
          })}
        </p>

        <ul className="mt-5 flex flex-col gap-2 text-start">
          {requirements.map((r) => (
            <RequirementRow key={r.key} done={r.done} label={r.label} status={r.done ? t("verified") : t("notVerified")} />
          ))}
        </ul>

        <div className="mt-6 flex flex-col gap-3 sm:flex-row sm:justify-center">
          <Link href="/account" className="inline-flex items-center justify-center rounded-md bg-blue-600 px-4 py-2.5 text-sm font-medium text-white hover:bg-blue-700 transition-colors">
            {t("goToAccount")}
          </Link>
          {variant === "apply" && (
            <Link href="/" className="inline-flex items-center justify-center rounded-md border border-slate-300 dark:border-slate-700 px-4 py-2.5 text-sm font-medium text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors">
              {t("goHome")}
            </Link>
          )}
        </div>

        {variant === "report" && (
          <div className="mt-6 rounded-xl border border-red-200 bg-red-50 p-4 text-start dark:border-red-900 dark:bg-red-950/30">
            <p className="mb-2 flex items-center gap-2 text-sm font-semibold text-red-800 dark:text-red-200">
              <Phone className="h-4 w-4" aria-hidden="true" /> {tKyc("emergencyNow")}
            </p>
            <div className="flex flex-wrap gap-2">
              {[
                ["122", tKyc("police")],
                ["123", tKyc("ambulance")],
                ["180", tKyc("fire")],
              ].map(([number, name]) => (
                <a
                  key={number}
                  href={`tel:${number}`}
                  className="rounded-md bg-white px-3 py-2 text-sm font-semibold text-red-700 shadow-sm hover:bg-red-100 dark:bg-slate-900 dark:text-red-300"
                >
                  <span dir="ltr">{number}</span> · {name}
                </a>
              ))}
            </div>
          </div>
        )}
      </section>
    </div>
  );
}