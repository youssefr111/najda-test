import type { UserRole } from "@/lib/auth/roles";
import type { AddressPayload } from "@/lib/address/address";
import type { KycStatus } from "@/lib/kyc/kyc";

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
  addressDetails?: AddressPayload | null;
  /** Identity verification outcome. */
  kycStatus?: KycStatus;
  roleName: UserRole;
  facilityId: number | null;
  facilityName: string | null;
  gender?: Gender;
  profileCompleted: boolean;
  enabled: boolean;
  createdAt: string;
}