export type Role =
  | "CITIZEN"
  | "DISPATCHER"
  | "AMBULANCE_CREW"
  | "POLICE"
  | "FIREFIGHTER"
  | "FIRST_RESPONDER"
  | "HOSPITAL_STAFF"
  | "ADMIN"
  | "SUPER_ADMIN";

/** Roles that get a dedicated field UI in this app (bottom tabs, shift, missions). */
export const RESPONDER_ROLES: Role[] = ["AMBULANCE_CREW", "POLICE", "FIREFIGHTER", "FIRST_RESPONDER"];

/**
 * Desk roles (Dispatcher / Hospital Staff / Admin / Super Admin) don't have a
 * mobile surface in this app — their work happens on the web console. They
 * can still use the app, just as a citizen would, so a role check never
 * locks anyone out.
 */
export function isResponderRole(role: Role): boolean {
  return RESPONDER_ROLES.includes(role);
}
