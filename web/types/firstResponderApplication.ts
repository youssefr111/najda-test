export type ApplicationStatus = "PENDING" | "APPROVED" | "REJECTED";

export interface ApplicationDocument {
  id: number;
  originalFileName: string | null;
}

export interface FirstResponderApplication {
  id: number;
  citizenId: number;
  citizenName: string;
  motivation: string;
  status: ApplicationStatus;
  submittedAt: string;
  reviewedAt: string | null;
  reviewNotes: string | null;
  documents: ApplicationDocument[];
}