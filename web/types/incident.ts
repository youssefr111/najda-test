export type IncidentCategory = "MEDICAL" | "POLICE" | "FIRE";
export type LocationSource = "GPS" | "MANUAL_PIN";
export type IncidentStatus =
  | "NEW" | "AI_PROCESSED" | "DISPATCHER_REVIEW" | "ASSIGNED" | "IN_PROGRESS" | "RESOLVED" | "CANCELLED";
export type AiPriority = "CRITICAL" | "HIGH" | "MEDIUM" | "LOW";
export type MediaType = "PHOTO" | "VIDEO" | "AUDIO" | "TEXT";

export interface IncidentMedia {
  id: number;
  mediaType: MediaType;
  textContent: string | null;
  uploadedAt: string;
  updatedAt: string | null;
}

export type CancellationCategory =
  | "SUBMITTED_BY_MISTAKE" | "SITUATION_RESOLVED" | "GOT_HELP_ELSEWHERE" | "DUPLICATE_REPORT" | "OTHER";

export interface Incident {
  id: number;
  citizenId: number;
  citizenName: string;
  category: IncidentCategory;
  latitude: number;
  longitude: number;
  address: string | null;
  locationSource: LocationSource;
  injuredCount: number;
  status: IncidentStatus;
  aiPriority: AiPriority | null;
  aiConfidence: number | null;
  aiSuggestedDuplicateOfId: number | null;
  aiDuplicateConfidence: number | null;
  media: IncidentMedia[];
  createdAt: string;
  cancellationCategory: CancellationCategory | null;
  cancellationReason: string | null;
  cancelledAt: string | null;
  falseReportType: FalseReportType | null;
  falseReportMarkedAt: string | null;
}

export interface SubmitIncidentRequest {
  category: IncidentCategory;
  textMessage: string | null;
  latitude: number;
  longitude: number;
  locationSource: LocationSource;
  injuredCount: number;
}

export interface CreateIncidentMediaRequest {
  incidentId: number;
  mediaType: Exclude<MediaType, "TEXT">;
  url: string;
}

export interface CallerHistory {
  cancellationWindowDays: number;
  totalReports: number;
  cancelledReports: number;
  cancelledAfterDispatch: number;
  falseReportWindowDays: number;
  falseReports: number;
}

export interface FlaggedCaller {
  userId: number;
  name: string;
  email: string | null;
  accountEnabled: boolean;
  cancellationWindowDays: number;
  totalReports: number;
  cancelledReports: number;
  cancelledAfterDispatch: number;
  falseReportWindowDays: number;
  falseReports: number;
  lastCancelledAt: string | null;
}

export interface IncidentViewer {
  userId: number;
  name: string;
}

export type FalseReportType = "PRANK_OR_HOAX" | "SPAM_OR_TEST" | "MALICIOUS";