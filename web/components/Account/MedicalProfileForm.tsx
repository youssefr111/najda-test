"use client";

import { useState, type FormEvent, type ReactNode } from "react";
import Link from "next/link";
import { useTranslations } from "next-intl";
import { useUpdateMedicalProfile } from "@/hooks/users/useUpdateMedicalProfile";
import { isValidEgyptianMobile, toE164EgyptianPhone } from "@/components/Auth/PhoneField";
import { todayIsoDate } from "@/lib/medical/profile";
import {
  ALLERGIES,
  BLOOD_TYPES,
  BLOOD_TYPE_LABELS,
  MAX_EMERGENCY_CONTACTS,
  MAX_NOTES_LENGTH,
  MEDICAL_CONDITIONS,
  type Allergy,
  type BloodType,
  type MedicalCondition,
  type MedicalProfile,
} from "@/types/medicalProfile";
import EmergencyContactsEditor, {
  newContactDraft,
  type ContactDraft,
  type ContactErrors,
} from "./EmergencyContactsEditor";
import FormActions from "./FormActions";
import MedicalHistorySection from "./MedicalHistorySection";
import { FIELD_CLASS, LABEL_CLASS } from "./styles";

const MIN_WEIGHT_KG = 1;
const MAX_WEIGHT_KG = 500;

interface Props {
  profile: MedicalProfile;
  onSaved: () => void;
  onCancel: () => void;
  submitLabel?: string;
  cancelLabel?: string;
}

interface FormState {
  dateOfBirth: string;
  weightKg: string;
  bloodType: BloodType | "";
  noKnownAllergies: boolean;
  allergies: Allergy[];
  allergyNotes: string;
  noKnownConditions: boolean;
  conditions: MedicalCondition[];
  conditionNotes: string;
  currentMedications: string;
  medicalNotes: string;
  contacts: ContactDraft[];
  shareWithResponders: boolean;
}

const toFormState = (profile: MedicalProfile): FormState => ({
  dateOfBirth: profile.dateOfBirth ?? "",
  weightKg: profile.weightKg === null ? "" : String(profile.weightKg),
  bloodType: profile.bloodType ?? "",
  noKnownAllergies: profile.noKnownAllergies,
  allergies: profile.allergies,
  allergyNotes: profile.allergyNotes ?? "",
  noKnownConditions: profile.noKnownConditions,
  conditions: profile.conditions,
  conditionNotes: profile.conditionNotes ?? "",
  currentMedications: profile.currentMedications ?? "",
  medicalNotes: profile.medicalNotes ?? "",
  contacts:
    profile.emergencyContacts.length > 0
      ? profile.emergencyContacts.map((contact) => ({
          key: crypto.randomUUID(),
          name: contact.name,
          relationship: contact.relationship,
          phone: contact.phone.replace(/^\+20/, ""),
        }))
      : [newContactDraft()],
  shareWithResponders: profile.shareWithResponders,
});

const toggle = <T,>(items: T[], item: T): T[] =>
  items.includes(item) ? items.filter((i) => i !== item) : [...items, item];

const isBlankContact = (contact: ContactDraft) =>
  contact.name.trim() === "" && contact.relationship === "" && contact.phone === "";

export default function MedicalProfileForm({ profile, onSaved, onCancel, submitLabel, cancelLabel }: Props) {
  const t = useTranslations("medicalProfile");
  const tCommon = useTranslations("common");
  const tAllergy = useTranslations("enums.allergy");
  const tCondition = useTranslations("enums.medicalCondition");

  const [form, setForm] = useState<FormState>(() => toFormState(profile));
  const [contactErrors, setContactErrors] = useState<ContactErrors>({});
  const [weightInvalid, setWeightInvalid] = useState(false);
  const updateProfile = useUpdateMedicalProfile();

  const patch = (changes: Partial<FormState>) => setForm((prev) => ({ ...prev, ...changes }));

  function handleSubmit(e: FormEvent) {
    e.preventDefault();

    const weight = form.weightKg === "" ? null : Number(form.weightKg);
    const weightIsInvalid = weight !== null && !(weight >= MIN_WEIGHT_KG && weight <= MAX_WEIGHT_KG);

    const filledContacts = form.contacts.filter((contact) => !isBlankContact(contact));
    const errors: ContactErrors = {};
    for (const contact of filledContacts) {
      if (contact.name.trim() === "" || contact.relationship === "" || contact.phone === "") {
        errors[contact.key] = "incomplete";
      } else if (!isValidEgyptianMobile(contact.phone)) {
        errors[contact.key] = "invalid";
      }
    }

    setWeightInvalid(weightIsInvalid);
    setContactErrors(errors);
    if (weightIsInvalid || Object.keys(errors).length > 0) return;

    updateProfile.mutate(
      {
        dateOfBirth: form.dateOfBirth || null,
        weightKg: weight,
        bloodType: form.bloodType || null,
        noKnownAllergies: form.noKnownAllergies,
        allergies: form.allergies,
        allergyNotes: form.allergyNotes.trim() || null,
        noKnownConditions: form.noKnownConditions,
        conditions: form.conditions,
        conditionNotes: form.conditionNotes.trim() || null,
        currentMedications: form.currentMedications.trim() || null,
        medicalNotes: form.medicalNotes.trim() || null,
        emergencyContacts: filledContacts.map((contact) => ({
          name: contact.name.trim(),
          // Narrowed above: a filled contact that passed validation always has a relationship.
          relationship: contact.relationship as Exclude<typeof contact.relationship, "">,
          phone: toE164EgyptianPhone(contact.phone),
        })),
        shareWithResponders: form.shareWithResponders,
      },
      { onSuccess: onSaved },
    );
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-8">
      <FormSection title={t("basics")}>
        <div className="grid gap-4 sm:grid-cols-3">
          <label className="flex flex-col gap-1.5">
            <span className={LABEL_CLASS}>{t("dateOfBirth")}</span>
            <input
              type="date"
              value={form.dateOfBirth}
              max={todayIsoDate()}
              onChange={(e) => patch({ dateOfBirth: e.target.value })}
              className={FIELD_CLASS}
            />
          </label>
          <label className="flex flex-col gap-1.5">
            <span className={LABEL_CLASS}>{t("weight")}</span>
            <div className="relative">
              <input
                type="number"
                inputMode="decimal"
                min={MIN_WEIGHT_KG}
                max={MAX_WEIGHT_KG}
                step="0.1"
                value={form.weightKg}
                onChange={(e) => patch({ weightKg: e.target.value })}
                aria-invalid={weightInvalid}
                className={`${FIELD_CLASS} w-full pe-10 ${weightInvalid ? "border-red-400 dark:border-red-700" : ""}`}
              />
              <span className="pointer-events-none absolute inset-e-3 top-1/2 -translate-y-1/2 text-xs text-slate-400">
                {t("kg")}
              </span>
            </div>
            {weightInvalid && (
              <span role="alert" className="text-xs text-red-600 dark:text-red-400">
                {t("weightInvalid", { min: MIN_WEIGHT_KG, max: MAX_WEIGHT_KG })}
              </span>
            )}
          </label>
          <label className="flex flex-col gap-1.5">
            <span className={LABEL_CLASS}>{t("bloodType")}</span>
            <select
              value={form.bloodType}
              onChange={(e) => patch({ bloodType: e.target.value as BloodType | "" })}
              className={`${FIELD_CLASS} cursor-pointer`}
            >
              <option value="">{t("notSpecified")}</option>
              {BLOOD_TYPES.map((type) => (
                <option key={type} value={type}>{BLOOD_TYPE_LABELS[type]}</option>
              ))}
            </select>
          </label>
        </div>
      </FormSection>

      <FormSection>
        <MedicalHistorySection
          legend={t("allergies")}
          noneLabel={t("noKnownAllergies")}
          noneChecked={form.noKnownAllergies}
          onNoneChange={(checked) =>
            patch(checked ? { noKnownAllergies: true, allergies: [], allergyNotes: "" } : { noKnownAllergies: false })
          }
          options={ALLERGIES}
          selected={form.allergies}
          getLabel={(allergy) => tAllergy(allergy)}
          onToggle={(allergy) => patch({ allergies: toggle(form.allergies, allergy) })}
          notesLabel={t("allergyNotesLabel")}
          notesPlaceholder={t("allergyNotesPlaceholder")}
          notes={form.allergyNotes}
          onNotesChange={(allergyNotes) => patch({ allergyNotes })}
        />
      </FormSection>

      <FormSection>
        <MedicalHistorySection
          legend={t("conditions")}
          noneLabel={t("noKnownConditions")}
          noneChecked={form.noKnownConditions}
          onNoneChange={(checked) =>
            patch(checked ? { noKnownConditions: true, conditions: [], conditionNotes: "" } : { noKnownConditions: false })
          }
          options={MEDICAL_CONDITIONS}
          selected={form.conditions}
          getLabel={(condition) => tCondition(condition)}
          onToggle={(condition) => patch({ conditions: toggle(form.conditions, condition) })}
          notesLabel={t("conditionNotesLabel")}
          notesPlaceholder={t("conditionNotesPlaceholder")}
          notes={form.conditionNotes}
          onNotesChange={(conditionNotes) => patch({ conditionNotes })}
        />
      </FormSection>

      <FormSection>
        <label className="flex flex-col gap-1.5">
          <span className={LABEL_CLASS}>{t("medications")}</span>
          <textarea
            value={form.currentMedications}
            onChange={(e) => patch({ currentMedications: e.target.value })}
            maxLength={MAX_NOTES_LENGTH}
            rows={3}
            placeholder={t("medicationsPlaceholder")}
            className={`${FIELD_CLASS} resize-y`}
          />
        </label>
        <label className="flex flex-col gap-1.5">
          <span className={LABEL_CLASS}>{t("medicalNotes")}</span>
          <textarea
            value={form.medicalNotes}
            onChange={(e) => patch({ medicalNotes: e.target.value })}
            maxLength={MAX_NOTES_LENGTH}
            rows={3}
            placeholder={t("medicalNotesPlaceholder")}
            className={`${FIELD_CLASS} resize-y`}
          />
        </label>
      </FormSection>

      <FormSection title={t("emergencyContacts")} description={t("emergencyContactsHint", { max: MAX_EMERGENCY_CONTACTS })}>
        <EmergencyContactsEditor
          contacts={form.contacts}
          errors={contactErrors}
          onChange={(contacts) => patch({ contacts })}
        />
      </FormSection>

      <FormSection>
        <label className="flex items-start gap-3 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50/60 dark:bg-slate-950/40 p-4 cursor-pointer">
          <input
            type="checkbox"
            checked={form.shareWithResponders}
            onChange={(e) => patch({ shareWithResponders: e.target.checked })}
            className="mt-0.5 size-4 shrink-0 accent-blue-600 cursor-pointer"
          />
          <span className="flex flex-col gap-1">
            <span className="text-sm font-medium text-slate-900 dark:text-slate-100">{t("sharing.label")}</span>
            <span className="text-sm text-slate-500 dark:text-slate-400">
              {t.rich("sharing.description", {
                privacy: (chunks) => (
                  <Link href="/privacy" className="text-blue-600 dark:text-blue-400 hover:underline">{chunks}</Link>
                ),
              })}
            </span>
          </span>
        </label>
      </FormSection>

      {updateProfile.isError && (
        <p role="alert" className="text-sm text-red-600 dark:text-red-400">{t("saveError")}</p>
      )}

      <FormActions
        submitLabel={submitLabel ?? tCommon("save")}
        pendingLabel={t("saving")}
        pending={updateProfile.isPending}
        onCancel={onCancel}
        cancelLabel={cancelLabel}
      />
    </form>
  );
}

function FormSection({ title, description, children }: { title?: string; description?: string; children: ReactNode }) {
  return (
    <section className="flex flex-col gap-4 border-t border-slate-100 dark:border-slate-800 pt-8 first:border-t-0 first:pt-0">
      {title && (
        <div>
          <h3 className="text-sm font-semibold text-slate-900 dark:text-slate-100">{title}</h3>
          {description && <p className="mt-0.5 text-sm text-slate-500 dark:text-slate-400">{description}</p>}
        </div>
      )}
      {children}
    </section>
  );
}