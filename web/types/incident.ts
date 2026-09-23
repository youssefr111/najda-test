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