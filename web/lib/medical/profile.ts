import type { MedicalProfile } from "@/types/medicalProfile";

/** Medical details go stale; after this long we ask the user to double-check them. */
export const STALE_AFTER_MONTHS = 6;

/** Sharing consent alone doesn't make a profile non-empty: it has to hold actual information. */
export function isMedicalProfileEmpty(profile: MedicalProfile): boolean {
  return (
    !profile.dateOfBirth &&
    profile.weightKg === null &&
    !profile.bloodType &&
    !profile.noKnownAllergies &&
    profile.allergies.length === 0 &&
    !profile.allergyNotes &&
    !profile.noKnownConditions &&
    profile.conditions.length === 0 &&
    !profile.conditionNotes &&
    !profile.currentMedications &&
    !profile.medicalNotes &&
    profile.emergencyContacts.length === 0
  );
}

/** Whole calendar months between an ISO timestamp and now. */
export function monthsSince(isoTimestamp: string): number {
  const then = new Date(isoTimestamp);
  const now = new Date();
  return (now.getFullYear() - then.getFullYear()) * 12 + (now.getMonth() - then.getMonth());
}

/** Age in whole years from an ISO date (yyyy-mm-dd). */
export function ageFromDateOfBirth(isoDate: string): number {
  const born = new Date(`${isoDate}T00:00:00`);
  const today = new Date();
  const hadBirthdayThisYear =
    today.getMonth() > born.getMonth() ||
    (today.getMonth() === born.getMonth() && today.getDate() >= born.getDate());
  return today.getFullYear() - born.getFullYear() - (hadBirthdayThisYear ? 0 : 1);
}

/** Today as yyyy-mm-dd in the user's local time, e.g. for an <input type="date"> max. */
export function todayIsoDate(): string {
  const now = new Date();
  const month = String(now.getMonth() + 1).padStart(2, "0");
  const day = String(now.getDate()).padStart(2, "0");
  return `${now.getFullYear()}-${month}-${day}`;
}