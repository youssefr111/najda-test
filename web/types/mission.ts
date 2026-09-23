import type { UnitType } from "./unit";

export type MissionStatus = "OFFERED" | "ACCEPTED" | "REJECTED" | "EN_ROUTE" | "ARRIVED" | "COMPLETED" | "CANCELLED";

export interface Mission {
  id: number;
  incidentId: number;
  unitType: UnitType;
  unitId: number;
  unitPlateNumber: string;
  status: MissionStatus;
  participantNames: string[];
  offeredAt: string;
  acceptedAt: string | null;
  arrivedAt: string | null;
  completedAt: string | null;
}

export interface AssignUnitMissionRequest {
  incidentId: number;
  unitId: number;
}