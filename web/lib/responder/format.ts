import type { UserRole } from "@/lib/auth/roles";
import type { UnitType } from "@/types/unit";

export const ROLE_UNIT_TYPE: Partial<Record<UserRole, UnitType>> = {
    FIRST_RESPONDER: "FIRST_RESPONDER",
    AMBULANCE_CREW: "AMBULANCE",
    POLICE: "POLICE_CAR",
    FIREFIGHTER: "FIRE_TRUCK",
};