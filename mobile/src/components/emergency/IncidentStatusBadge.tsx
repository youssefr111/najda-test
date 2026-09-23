import { useTranslation } from "react-i18next";
import { Badge } from "@/components/ui/Badge";
import type { AiPriority, IncidentStatus, MissionStatus } from "@/types";

const STATUS_TONE: Record<IncidentStatus, "neutral" | "info" | "success" | "warning" | "danger"> = {
  NEW: "info",
  AI_PROCESSED: "info",
  DISPATCHER_REVIEW: "info",
  ASSIGNED: "warning",
  IN_PROGRESS: "warning",
  RESOLVED: "success",
  CANCELLED: "neutral",
};

const MISSION_TONE: Record<MissionStatus, "neutral" | "info" | "success" | "warning" | "danger"> = {
  OFFERED: "info",
  ACCEPTED: "warning",
  EN_ROUTE: "warning",
  ARRIVED: "warning",
  COMPLETED: "success",
  REJECTED: "neutral",
  CANCELLED: "neutral",
};

const PRIORITY_TONE: Record<AiPriority, "neutral" | "info" | "success" | "warning" | "danger"> = {
  CRITICAL: "danger",
  HIGH: "warning",
  MEDIUM: "info",
  LOW: "neutral",
};

export function IncidentStatusBadge({ status }: { status: IncidentStatus }) {
  const { t } = useTranslation();
  return <Badge label={t(`enums.incidentStatus.${status}`)} tone={STATUS_TONE[status]} />;
}

export function MissionStatusBadge({ status }: { status: MissionStatus }) {
  const { t } = useTranslation();
  return <Badge label={t(`enums.missionStatus.${status}`)} tone={MISSION_TONE[status]} />;
}

export function PriorityBadge({ priority }: { priority: AiPriority }) {
  const { t } = useTranslation();
  return <Badge label={t(`enums.aiPriority.${priority}`)} tone={PRIORITY_TONE[priority]} />;
}
