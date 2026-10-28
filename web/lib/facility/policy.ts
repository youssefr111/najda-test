import type { FacilityType } from "@/types/facility";
import type { UserRole } from "@/lib/auth/roles";

export const ROLE_FACILITY_TYPES: Partial<Record<UserRole, FacilityType[]>> = {
  HOSPITAL_STAFF: ["HOSPITAL"],
  AMBULANCE_CREW: ["AMBULANCE_STATION", "HOSPITAL"],
  POLICE: ["POLICE_STATION"],
  FIREFIGHTER: ["FIRE_STATION"],
  // A manager runs one facility of any type.
  FACILITY_MANAGER: ["HOSPITAL", "AMBULANCE_STATION", "FIRE_STATION", "POLICE_STATION"],
};

const FACILITY_REQUIRED_ROLES: Set<UserRole> = new Set(["HOSPITAL_STAFF", "AMBULANCE_CREW", "POLICE", "FIREFIGHTER", "FACILITY_MANAGER"]);

export function allowsFacility(role: UserRole | undefined): boolean {
  return !!role && role in ROLE_FACILITY_TYPES;
}
export function requiresFacility(role: UserRole): boolean {
  return FACILITY_REQUIRED_ROLES.has(role);
}