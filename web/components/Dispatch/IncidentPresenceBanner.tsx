"use client";

import { Users } from "lucide-react";
import { useTranslations } from "next-intl";
import { useIncidentPresence } from "@/hooks/incidents/useIncidentPresence";

export default function IncidentPresenceBanner({ incidentId }: { incidentId: number }) {
  const t = useTranslations("incidentPresence");
  const viewers = useIncidentPresence(incidentId);

  if (viewers.length === 0) return null;

  return (
    <p className="flex items-center gap-1.5 rounded-md border border-sky-200 dark:border-sky-900/60 bg-sky-50 dark:bg-sky-950/30 px-3 py-2 text-xs text-sky-800 dark:text-sky-300">
      <Users className="w-3.5 h-3.5 shrink-0" />
      {t("alsoViewing", { names: viewers.map((viewer) => viewer.name).join(", ") })}
    </p>
  );
}