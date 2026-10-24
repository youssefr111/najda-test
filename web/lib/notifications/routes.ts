import { getRoleHome } from "@/lib/auth/roles";
import type { NotificationType } from "@/types/notification";

/**
 * Where clicking a notification should take this user. One mapping shared by the
 * bell, the inbox page and the system notification, so they always agree.
 */
export function notificationHref(
  type: NotificationType,
  data: Record<string, string>,
  roleName?: string,
): string {
  const incidentId = data.incidentId;

  switch (type) {
    case "INCIDENT_ACCEPTED":
    case "INCIDENT_EN_ROUTE":
    case "INCIDENT_ARRIVED":
    case "INCIDENT_RESOLVED":
    case "INCIDENT_CLOSED_FALSE_REPORT":
    case "INCIDENT_CLOSED_DUPLICATE":
      return incidentId ? `/incidents/${incidentId}` : "/notifications";

    case "CHAT_MESSAGE":
      // A citizen's chat is on their report; everyone else works from their dashboard.
      return roleName === "CITIZEN" && incidentId ? `/incidents/${incidentId}` : getRoleHome(roleName);

    case "INCIDENT_NEW":
    case "INCIDENT_CANCELLED_BY_CITIZEN":
    case "MISSION_REJECTED":
    case "MISSION_WITHDRAWN":
    case "MISSION_OFFERED":
    case "MISSION_CANCELLED":
    case "PATIENT_INCOMING":
      return getRoleHome(roleName);

    case "APPLICATION_SUBMITTED":
      return "/admin/applications";
    case "APPLICATION_REJECTED":
      return "/become-a-responder";
    case "APPLICATION_APPROVED":
      return getRoleHome("FIRST_RESPONDER");
      
    case "LEGAL_UPDATED": return "/"

    default:
      return "/notifications";
  }
}
