export interface HospitalTransfer {
  id: number;
  missionId: number;
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
}