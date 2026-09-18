import type { UserRole } from "@/lib/auth/roles";

export type Gender = "MALE" | "FEMALE";

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
  roleName: UserRole;
  facilityId: number | null;
  facilityName: string | null;
  gender?: Gender;
  profileCompleted: boolean;
  enabled: boolean;
  createdAt: string;
}