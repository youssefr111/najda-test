"use client";

import { useTranslations } from "next-intl";
import { Clock } from "lucide-react";
import { useRouteEta, type Point } from "@/hooks/missions/useRouteEta";
import type { UnitType } from "@/types/unit";

/** "≈ 7 min · 4.2 km by road" for a unit that is travelling to `to`. */
export default function MissionEta({ from, to, unitType }: { from: Point | null; to: Point | null; unitType: UnitType }) {
  const t = useTranslations("missionList");
  const eta = useRouteEta(from, to, unitType);
  if (!eta) return null;

  const params = { minutes: eta.minutes, distance: eta.distanceKm.toFixed(1) };
  return (
    <p className="mt-1 flex items-center gap-1 text-xs font-medium text-blue-600 dark:text-blue-400">
      <Clock size={12} />
      {eta.source === "route" ? t("etaRoute", params) : t("etaEstimate", params)}
    </p>
  );
}
