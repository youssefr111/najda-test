import type { Role } from "./role";

export type Gender = "MALE" | "FEMALE";

/** Mirrors the backend's UserResponse (GET /api/auth/me). */
export interface User {
  id: number;
  firebaseUid: string;
  firstName: string;
  lastName: string;
  email: string;
  emailVerified: boolean;
  phone: string | null;
  phoneVerified: boolean;
  address: string | null;
  roleName: Role;
  facilityId: number | null;
  facilityName: string | null;
  gender?: Gender;
  profileCompleted: boolean;
  enabled: boolean;
  createdAt: string;
}
