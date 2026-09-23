import type { Role } from "@/types/role";

/**
 * Where each role lands after login. Only CITIZEN and the four field roles
 * get a dedicated area in this app; every other role falls back to the
 * citizen experience, since their real work happens on the web console.
 */
export function getRoleHome(role: Role | string | undefined | null): "/citizen" | "/responder" {
  switch (role) {
    case "AMBULANCE_CREW":
    case "POLICE":
    case "FIREFIGHTER":
    case "FIRST_RESPONDER":
      return "/responder";
    default:
      return "/citizen";
  }
}
