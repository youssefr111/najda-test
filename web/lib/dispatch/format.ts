import type { IncidentCategory, IncidentStatus, AiPriority } from "@/types/incident";
import type { UnitType, UnitStatus } from "@/types/unit";
import type { MissionStatus } from "@/types/mission";
import type { useTranslations } from "next-intl";

export const CATEGORY_LABEL: Record<IncidentCategory, string> = {
  MEDICAL: "Medical",
  FIRE: "Fire",
  POLICE: "Police",
};

export function categoryLabel(t: ReturnType<typeof useTranslations<"enums">>, category: IncidentCategory): string {
  return t(`category.${category}`);
}

export const CATEGORY_UNIT_TYPE: Record<IncidentCategory, UnitType> = {
  MEDICAL: "AMBULANCE",
  FIRE: "FIRE_TRUCK",
  POLICE: "POLICE_CAR",
};

export const CATEGORY_BADGE: Record<IncidentCategory, string> = {
  MEDICAL: "bg-blue-50 text-blue-700 dark:bg-blue-950/40 dark:text-blue-300",
  FIRE: "bg-orange-50 text-orange-700 dark:bg-orange-950/40 dark:text-orange-300",
  POLICE: "bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300",
};

export const PRIORITY_BADGE: Record<AiPriority, string> = {
  CRITICAL: "bg-red-50 text-red-700 dark:bg-red-950/40 dark:text-red-300",
  HIGH: "bg-orange-50 text-orange-700 dark:bg-orange-950/40 dark:text-orange-300",
  MEDIUM: "bg-amber-50 text-amber-700 dark:bg-amber-950/40 dark:text-amber-300",
  LOW: "bg-emerald-50 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-300",
};

export const INCIDENT_STATUS_LABEL: Record<IncidentStatus, string> = {
  NEW: "New",
  AI_PROCESSED: "AI Processed",
  DISPATCHER_REVIEW: "In Review",
  ASSIGNED: "Assigned",
  IN_PROGRESS: "In Progress",
  RESOLVED: "Resolved",
  CANCELLED: "Cancelled",
};

export const UNIT_TYPE_LABEL: Record<UnitType, string> = {
  AMBULANCE: "Ambulance",
  FIRE_TRUCK: "Fire Truck",
  POLICE_CAR: "Police Car",
  FIRST_RESPONDER: "First Responder",
};

export const UNIT_STATUS_BADGE: Record<UnitStatus, string> = {
  AVAILABLE: "bg-emerald-50 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-300",
  BUSY: "bg-amber-50 text-amber-700 dark:bg-amber-950/40 dark:text-amber-300",
  OFFLINE: "bg-slate-100 text-slate-500 dark:bg-slate-800 dark:text-slate-400",
  MAINTENANCE: "bg-red-50 text-red-700 dark:bg-red-950/40 dark:text-red-300",
};

export const MISSION_STATUS_BADGE: Record<MissionStatus, string> = {
  OFFERED: "bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-300",
  ACCEPTED: "bg-blue-50 text-blue-700 dark:bg-blue-950/40 dark:text-blue-300",
  REJECTED: "bg-red-50 text-red-700 dark:bg-red-950/40 dark:text-red-300",
  EN_ROUTE: "bg-amber-50 text-amber-700 dark:bg-amber-950/40 dark:text-amber-300",
  ARRIVED: "bg-emerald-50 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-300",
  COMPLETED: "bg-emerald-100 text-emerald-800 dark:bg-emerald-900/50 dark:text-emerald-200",
  CANCELLED: "bg-slate-100 text-slate-500 dark:bg-slate-800 dark:text-slate-400",
};

export function relativeTime(iso: string): string {
  const diffMin = Math.round((Date.now() - new Date(iso).getTime()) / 60000);
  if (diffMin < 1) return "just now";
  if (diffMin < 60) return `${diffMin}m ago`;
  const diffHr = Math.round(diffMin / 60);
  if (diffHr < 24) return `${diffHr}h ago`;
  return new Date(iso).toLocaleDateString();
}

export function incidentStatusLabel(t: ReturnType<typeof useTranslations<"enums">>, status: IncidentStatus): string {
  return t(`incidentStatus.${status}`);
}

export function unitTypeLabel(t: ReturnType<typeof useTranslations<"enums">>, type: UnitType): string {
  return t(`unitType.${type}`);
}
export function unitStatusLabel(t: ReturnType<typeof useTranslations<"enums">>, status: string): string {
  return t(`unitStatus.${status}`);
}
export function missionStatusLabel(t: ReturnType<typeof useTranslations<"enums">>, status: string): string {
  return t(`missionStatus.${status}`);
}