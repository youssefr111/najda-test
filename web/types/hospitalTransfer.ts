export interface HospitalTransfer {
  id: number;
  missionId: number;
  incidentId: number;
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