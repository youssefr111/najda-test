"use client";

import { useTranslations } from "next-intl";
import { useBackendStatus } from "@/hooks/useBackendStatus";

const BADGE = {
  online: "bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300",
  waking: "bg-amber-100 text-amber-900 dark:bg-amber-950 dark:text-amber-200",
  degraded: "bg-orange-100 text-orange-800 dark:bg-orange-950 dark:text-orange-300",
  checking: "bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300",
  unreachable: "bg-red-100 text-red-800 dark:bg-red-950 dark:text-red-300",
  offline: "bg-red-100 text-red-800 dark:bg-red-950 dark:text-red-300",
} as const;

const SUMMARY = {
  online: "allGood",
  waking: "wakingSummary",
  degraded: "degradedSummary",
  checking: "checking",
  unreachable: "unreachableSummary",
  offline: "yourConnection",
} as const;

export default function StatusPage() {
  const t = useTranslations("status");
  const { status, components, latencyMs, lastChecked } = useBackendStatus();

  // When the server has answered, show one row per component.
  // Otherwise (cold start, offline, still checking) show a single API row with the overall state.
  const rows = components
    ? Object.entries(components).map(([name, state]) => ({
        name,
        badge: state === "UP" ? BADGE.online : BADGE.offline,
        label: state === "UP" ? t("up") : t("down"),
      }))
    : [{ name: "api", badge: BADGE[status], label: t(status) }];

  return (
    <main className="mx-auto flex w-full max-w-2xl flex-col gap-6 px-4 py-8 sm:py-12">
      <header>
        <h1 className="text-2xl font-semibold text-slate-900 dark:text-slate-100">{t("title")}</h1>
        <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">{t(SUMMARY[status])}</p>
      </header>

      <ul className="divide-y divide-slate-200 rounded-xl border border-slate-200 dark:divide-slate-800 dark:border-slate-800">
        {rows.map((row) => (
          <li key={row.name} className="flex items-center justify-between gap-3 p-4">
            <div>
              <p className="text-sm font-medium text-slate-900 dark:text-slate-100">
                {t(`component.${row.name}`)}
              </p>
              {row.name === "api" && (
                <p className="text-xs text-slate-500 dark:text-slate-400">
                  {latencyMs !== null ? t("responseTime", { ms: latencyMs }) : t("noData")}
                </p>
              )}
            </div>
            <span className={`shrink-0 rounded-full px-2.5 py-1 text-xs font-medium ${row.badge}`}>
              {row.label}
            </span>
          </li>
        ))}
      </ul>

      {lastChecked && (
        <p className="text-xs text-slate-400 dark:text-slate-500">
          {t("lastChecked", { time: new Date(lastChecked).toLocaleTimeString() })}
        </p>
      )}
    </main>
  );
}