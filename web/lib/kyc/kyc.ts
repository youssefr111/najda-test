export type KycStatus =
  | "NOT_STARTED"
  | "IN_PROGRESS"
  | "IN_REVIEW"
  | "VERIFIED"
  | "DECLINED"
  | "EXPIRED"
  | "ABANDONED";

/** GET /api/kyc/status */
export interface KycState {
  status: KycStatus;
  /** Verification is REQUIRED of this person to report (the switch is on, they are not exempt or grandfathered). */
  required: boolean;
  verified: boolean;
  verifiedAt: string | null;
  /** A short generic reason from the provider ("Document expired"); never personal data. */
  declineReason: string | null;
  /** False when the server has no Didit credentials. */
  providerConfigured: boolean;
}

/** The provider is still working (or a person is reviewing): the screen should keep checking. */
export const isKycPending = (status: KycStatus | undefined) => status === "IN_PROGRESS" || status === "IN_REVIEW";

/** Can start (or start again). */
export const canStartKyc = (status: KycStatus | undefined) => status !== "VERIFIED" && status !== "IN_REVIEW";
