export type FacilityType = "HOSPITAL" | "AMBULANCE_STATION" | "FIRE_STATION" | "POLICE_STATION";

export interface Facility {
  id: number;
  name: string;
  address: string | null;
  latitude: number;
  longitude: number;
  facilityType: FacilityType;
  registered: boolean;
}

export interface CreateFacilityRequest {
  name: string;
  address: string | null;
  latitude: number;
  longitude: number;
  facilityType: FacilityType;
}

export type UpdateFacilityRequest = CreateFacilityRequest;