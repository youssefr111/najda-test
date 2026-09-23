"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { Download, Loader2 } from "lucide-react";
import { apiFetch } from "@/lib/api/client";
import type { FacilityType } from "@/types/facility";

export default function SeedFacilitiesButton() {
  const t = useTranslations("admin.facilities.seed");
  const [state, setState] = useState<"idle" | "loading" | "started" | "error">("idle");
  const [message, setMessage] = useState<string | null>(null);

  const SEEDABLE: { type: FacilityType; label: string }[] = [
    { type: "HOSPITAL", label: t("hospitals") },
    { type: "FIRE_STATION", label: t("fire") },
    { type: "POLICE_STATION", label: t("police") },
  ];

  async function handleSeed(type: FacilityType) {
    setState("loading");
    try {
      const res = await apiFetch<{ message: string }>(`/api/admin/facilities/seed-once?type=${type}`, { method: "POST" });
      setMessage(res.message);
      setState("started");
    } catch (err) {
      setMessage(err instanceof Error ? err.message : t("error"));
      setState("error");
    }
  }

  return (
    <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
      <p className="text-sm text-slate-500 dark:text-slate-400">{message ?? t("defaultMessage")}</p>
      <div className="flex gap-2 shrink-0">
        {SEEDABLE.map(({ type, label }) => (
          <button key={type} type="button" onClick={() => handleSeed(type)} disabled={state === "loading"} className="flex items-center gap-1.5 px-3 py-2 bg-slate-900 dark:bg-slate-100 text-white dark:text-slate-900 text-sm font-medium rounded-md hover:opacity-90 transition-opacity disabled:opacity-50">
            {state === "loading" ? <Loader2 className="w-4 h-4 animate-spin" /> : <Download className="w-4 h-4" />} {label}
          </button>
        ))}
      </div>
    </div>
  );
}