import type { ReportedFor } from "./incident";

export interface HospitalTransfer {
  id: number;
  missionId: number;
  incidentId: number;
  /** Optional: when "OTHER", the reporter's medical profile never applies to this patient. */
  reportedFor?: ReportedFor;
  hospitalId: number | null;
  hospitalName: string | null;
  destinationNameFreetext: string | null;
  status: "SELECTED" | "EN_ROUTE" | "ARRIVED";
  incidentLatitude: number;
  incidentLongitude: number;
  unitType: string;
  unitLatitude: number | null;
  unitLongitude: number | null;
  unitFacilityId: number | null;
  unitFacilityLatitude: number | null;
  unitFacilityLongitude: number | null;
  /** The destination hospital's position (null for a free-text destination). */
  hospitalLatitude: number | null;
  hospitalLongitude: number | null;
}