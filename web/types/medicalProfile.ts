export const BLOOD_TYPES = [
  "A_POSITIVE", "A_NEGATIVE", "B_POSITIVE", "B_NEGATIVE",
  "AB_POSITIVE", "AB_NEGATIVE", "O_POSITIVE", "O_NEGATIVE",
] as const;

export const ALLERGIES = [
  "PENICILLIN", "SULFA", "ASPIRIN", "NSAIDS", "CODEINE", "CONTRAST_DYE",
  "PEANUTS", "TREE_NUTS", "EGGS", "MILK", "SHELLFISH",
  "LATEX", "INSECT_STINGS",
] as const;

export const MEDICAL_CONDITIONS = [
  "ASTHMA", "DIABETES_TYPE_1", "DIABETES_TYPE_2", "EPILEPSY", "HEART_DISEASE", "HYPERTENSION",
  "STROKE_HISTORY", "KIDNEY_DISEASE", "PACEMAKER_OR_IMPLANT", "ON_BLOOD_THINNERS", "PREGNANCY", "G6PD_DEFICIENCY",
] as const;

export const CONTACT_RELATIONSHIPS = [
  "PARENT", "SPOUSE", "SIBLING", "CHILD", "RELATIVE", "FRIEND", "OTHER",
] as const;

/** Must match the backend's @Size limits. */
export const MAX_EMERGENCY_CONTACTS = 3;
export const MAX_NOTES_LENGTH = 500;
export const MAX_CONTACT_NAME_LENGTH = 100;

export type BloodType = (typeof BLOOD_TYPES)[number];
export type Allergy = (typeof ALLERGIES)[number];
export type MedicalCondition = (typeof MEDICAL_CONDITIONS)[number];
export type ContactRelationship = (typeof CONTACT_RELATIONSHIPS)[number];

export const BLOOD_TYPE_LABELS: Record<BloodType, string> = {
  A_POSITIVE: "A+", A_NEGATIVE: "A-",
  B_POSITIVE: "B+", B_NEGATIVE: "B-",
  AB_POSITIVE: "AB+", AB_NEGATIVE: "AB-",
  O_POSITIVE: "O+", O_NEGATIVE: "O-",
};

export interface EmergencyContact {
  name: string;
  relationship: ContactRelationship;
  /** E.164, e.g. +201012345678 */
  phone: string;
}

export interface MedicalProfile {
  /** ISO date, e.g. 1990-03-12 */
  dateOfBirth: string | null;
  weightKg: number | null;
  bloodType: BloodType | null;
  /** An explicit "none" -- different from simply not having filled the list in. */
  noKnownAllergies: boolean;
  allergies: Allergy[];
  allergyNotes: string | null;
  noKnownConditions: boolean;
  conditions: MedicalCondition[];
  conditionNotes: string | null;
  currentMedications: string | null;
  medicalNotes: string | null;
  /** Ordered: the first one is the primary contact. */
  emergencyContacts: EmergencyContact[];
  /** Standing consent for responders to see this profile when the user reports an emergency. */
  shareWithResponders: boolean;
  updatedAt: string | null;
}

/** What a user who hasn't filled anything in yet has (and what the API returns for them). */
export const EMPTY_MEDICAL_PROFILE: MedicalProfile = {
  dateOfBirth: null,
  weightKg: null,
  bloodType: null,
  noKnownAllergies: false,
  allergies: [],
  allergyNotes: null,
  noKnownConditions: false,
  conditions: [],
  conditionNotes: null,
  currentMedications: null,
  medicalNotes: null,
  emergencyContacts: [],
  shareWithResponders: false,
  updatedAt: null,
};

/** Mirrors UpdateMedicalProfileRequest -- a full replacement, not a patch. */
export type UpdateMedicalProfileRequest = Omit<MedicalProfile, "updatedAt">;

/** What the people treating a patient get for an incident. */
export interface IncidentMedicalProfile {
  /** False when the patient hasn't allowed (or has since withdrawn) sharing. */
  shared: boolean;
  profile: MedicalProfile | null;
}