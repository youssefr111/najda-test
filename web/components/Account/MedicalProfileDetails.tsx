"use client";

import { useFormatter, useTranslations } from "next-intl";
import { ageFromDateOfBirth } from "@/lib/medical/profile";
import { BLOOD_TYPE_LABELS, type MedicalProfile } from "@/types/medicalProfile";
import DetailItem, { DetailList, EMPTY_VALUE } from "./DetailItem";

/**
 * Read-only rendering of a medical profile, in the order a responder needs it
 * (allergies and conditions first). Used on the account page and in the
 * responder/dispatcher/hospital views, so it must stay presentation-only.
 */
export default function MedicalProfileDetails({ profile }: { profile: MedicalProfile }) {
  const t = useTranslations("medicalProfile");
  const tAllergy = useTranslations("enums.allergy");
  const tCondition = useTranslations("enums.medicalCondition");
  const tRelationship = useTranslations("enums.contactRelationship");
  const format = useFormatter();

  const dateOfBirth = profile.dateOfBirth
    ? format.dateTime(new Date(`${profile.dateOfBirth}T00:00:00`), { dateStyle: "medium" })
    : null;

  return (
    <div className="flex flex-col gap-6">
      <dl className="grid grid-cols-3 gap-x-4 gap-y-5">
        <DetailItem label={t("bloodType")}>{profile.bloodType && BLOOD_TYPE_LABELS[profile.bloodType]}</DetailItem>
        <DetailItem label={t("age")}>
          {profile.dateOfBirth && (
            <>
              {t("ageValue", { age: ageFromDateOfBirth(profile.dateOfBirth) })}
              <span className="block text-xs text-slate-500 dark:text-slate-400">{dateOfBirth}</span>
            </>
          )}
        </DetailItem>
        <DetailItem label={t("weight")}>{profile.weightKg !== null && `${profile.weightKg} ${t("kg")}`}</DetailItem>
      </dl>

      <DetailList>
        <DetailItem label={t("allergies")} className="sm:col-span-2">
          <HistoryValue
            noKnown={profile.noKnownAllergies}
            noKnownLabel={t("noKnownAllergies")}
            chips={profile.allergies.map((allergy) => tAllergy(allergy))}
            notes={profile.allergyNotes}
          />
        </DetailItem>
        <DetailItem label={t("conditions")} className="sm:col-span-2">
          <HistoryValue
            noKnown={profile.noKnownConditions}
            noKnownLabel={t("noKnownConditions")}
            chips={profile.conditions.map((condition) => tCondition(condition))}
            notes={profile.conditionNotes}
          />
        </DetailItem>
        <DetailItem label={t("medications")}>
          {profile.currentMedications && <span className="whitespace-pre-wrap">{profile.currentMedications}</span>}
        </DetailItem>
        <DetailItem label={t("medicalNotes")}>
          {profile.medicalNotes && <span className="whitespace-pre-wrap">{profile.medicalNotes}</span>}
        </DetailItem>
      </DetailList>

      <div className="border-t border-slate-100 dark:border-slate-800 pt-6">
        <h3 className="mb-4 text-sm font-semibold text-slate-900 dark:text-slate-100">{t("emergencyContacts")}</h3>
        {profile.emergencyContacts.length === 0 ? (
          <p className="text-sm text-slate-900 dark:text-slate-100">{EMPTY_VALUE}</p>
        ) : (
          <ul className="grid gap-3 sm:grid-cols-2">
            {profile.emergencyContacts.map((contact, index) => (
              <li
                key={`${contact.phone}-${index}`}
                className="rounded-lg border border-slate-200 dark:border-slate-800 px-3 py-2.5 text-sm"
              >
                <p className="font-medium text-slate-900 dark:text-slate-100">
                  {contact.name}
                  <span className="ms-2 text-xs font-normal text-slate-500 dark:text-slate-400">
                    {tRelationship(contact.relationship)}
                    {index === 0 && profile.emergencyContacts.length > 1 && ` · ${t("primary")}`}
                  </span>
                </p>
                <a
                  href={`tel:${contact.phone}`}
                  dir="ltr"
                  className="inline-block text-blue-600 dark:text-blue-400 hover:underline"
                >
                  {contact.phone}
                </a>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}

function HistoryValue({
  noKnown, noKnownLabel, chips, notes,
}: { noKnown: boolean; noKnownLabel: string; chips: string[]; notes: string | null }) {
  if (noKnown) {
    return (
      <span className="inline-flex rounded-full bg-emerald-50 dark:bg-emerald-950/40 px-2.5 py-0.5 text-xs font-medium text-emerald-700 dark:text-emerald-400">
        {noKnownLabel}
      </span>
    );
  }
  if (chips.length === 0 && !notes) return <>{EMPTY_VALUE}</>;

  return (
    <div className="flex flex-col gap-2">
      {chips.length > 0 && (
        <ul className="flex flex-wrap gap-1.5">
          {chips.map((chip) => (
            <li
              key={chip}
              className="rounded-full border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 px-2.5 py-0.5 text-xs text-slate-700 dark:text-slate-300"
            >
              {chip}
            </li>
          ))}
        </ul>
      )}
      {notes && <p className="whitespace-pre-wrap">{notes}</p>}
    </div>
  );
}