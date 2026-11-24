import type { UnitType } from "@/types/unit";

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

export interface UpdateFacilityRequest extends CreateFacilityRequest {
  /** The admin confirmed that units which don't fit a new type should be relabelled to it. */
  convertUnits?: boolean;
}

/** What switching a facility to another type would do to its linked staff and units. */
export interface FacilityTypeChangeImpact {
  unitConversions: { from: UnitType; to: UnitType; count: number }[];
  /** Staff whose role doesn't fit the new type: never converted, they must be reassigned. */
  blockingStaff: number;
  /** Units that would need converting but are on a mission or on shift. */
  blockingUnits: number;
  blockedByActiveTransfers: boolean;
  canProceed: boolean;
}