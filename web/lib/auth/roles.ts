type RoleConfig = { home?: string };

export const ROLE_CONFIG: Record<string, RoleConfig> = {
  SUPER_ADMIN: { home: "/admin" },
  ADMIN: { home: "/admin" },
  DISPATCHER: { home: "/dispatch" },
  HOSPITAL_STAFF: { home: "/hospital" },
  FACILITY_MANAGER: { home: "/manager" },
  FIRST_RESPONDER: { home: "/responder" },
  AMBULANCE_CREW: { home: "/responder" },
  POLICE: { home: "/responder" },
  FIREFIGHTER: { home: "/responder" },
  CITIZEN: {},
};

export const getRoleHome = (role?: string) => ROLE_CONFIG[role as UserRole]?.home ?? "/";

export type UserRole = keyof typeof ROLE_CONFIG;

export const ADMIN_ROLES: UserRole[] = ["SUPER_ADMIN", "ADMIN"];
export const DISPATCH_ROLES: UserRole[] = ["DISPATCHER", "ADMIN", "SUPER_ADMIN"];
// A manager of a hospital also works the transfers dashboard (the server checks they are linked to that hospital).
export const HOSPITAL_ROLES: UserRole[] = ["HOSPITAL_STAFF", "FACILITY_MANAGER", "ADMIN", "SUPER_ADMIN"];
export const MANAGER_ROLES: UserRole[] = ["FACILITY_MANAGER"];
export const RESPONDER_ROLES: UserRole[] = ["AMBULANCE_CREW", "POLICE", "FIREFIGHTER", "FIRST_RESPONDER", "ADMIN", "SUPER_ADMIN"];