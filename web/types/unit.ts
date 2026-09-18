export type UnitType = "AMBULANCE" | "FIRE_TRUCK" | "POLICE_CAR" | "FIRST_RESPONDER";
export type UnitStatus = "AVAILABLE" | "BUSY" | "OFFLINE" | "MAINTENANCE";

export interface ResponseUnit {
  id: number;
  plateNumber: string | null;
  unitType: UnitType;
  status: UnitStatus;
  facilityId: number | null;
  facilityName: string | null;
  facilityLatitude: number | null;
  facilityLongitude: number | null;
  latitude: number | null;
  longitude: number | null;
  currentLeadName: string | null;
}

export interface CreateResponseUnitRequest {
  plateNumber: string;
  unitType: UnitType;
  facilityId: number | null;
}