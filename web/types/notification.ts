/** Mirrors the backend's NotificationType. */
export type NotificationType =
  | "INCIDENT_NEW"
  | "INCIDENT_CANCELLED_BY_CITIZEN"
  | "MISSION_REJECTED"
  | "MISSION_WITHDRAWN"
  | "APPLICATION_SUBMITTED"
  | "MISSION_OFFERED"
  | "MISSION_CANCELLED"
  | "PATIENT_INCOMING"
  | "INCIDENT_ACCEPTED"
  | "INCIDENT_EN_ROUTE"
  | "INCIDENT_ARRIVED"
  | "INCIDENT_RESOLVED"
  | "INCIDENT_CLOSED_FALSE_REPORT"
  | "INCIDENT_CLOSED_DUPLICATE"
  | "APPLICATION_APPROVED"
  | "APPLICATION_REJECTED"
  | "CHAT_MESSAGE"
  | "LEGAL_UPDATED";

/** Every supported language, written by the server: show the user's own. */
export type NotificationsLocalizedText = Record<string, string>;

export interface AppNotification {
  id: number;
  type: NotificationType;
  title: NotificationsLocalizedText;
  body: NotificationsLocalizedText;
  /** incidentId, missionId, applicationId, hospitalTransferId (all strings). */
  data: Record<string, string>;
  createdAt: string;
  read: boolean;
}

export interface NotificationPage {
  items: AppNotification[];
  /** Pass as `before` to fetch the next (older) page; null = no more. */
  nextBefore: number | null;
  unreadCount: number;
}
