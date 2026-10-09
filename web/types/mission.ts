import type { UnitType } from "./unit";
import type { CancellationCategory } from "./incident";

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
  incidentCancellationCategory: CancellationCategory | null;
  assignedByName: string | null;
}

export interface AssignUnitMissionRequest {
  incidentId: number;
  unitId: number;
}

/** Citizen-safe view of a unit working an incident. Coordinates are null when withheld or not yet reported. */
export interface IncidentResponder {
  missionId: number;
  unitType: UnitType;
  status: MissionStatus;
  latitude: number | null;
  longitude: number | null;
}