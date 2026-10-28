"use client";

import { useTranslations } from "next-intl";
import { Plus, Trash2 } from "lucide-react";
import PhoneField from "@/components/Auth/PhoneField";
import {
  CONTACT_RELATIONSHIPS,
  MAX_CONTACT_NAME_LENGTH,
  MAX_EMERGENCY_CONTACTS,
  type ContactRelationship,
} from "@/types/medicalProfile";
import { FIELD_CLASS, LABEL_CLASS } from "./styles";

export interface ContactDraft {
  /** Stable React key -- rows can be removed from the middle. */
  key: string;
  name: string;
  relationship: ContactRelationship | "";
  /** Local digits only -- the +20 prefix is added on submit, as in PhoneField. */
  phone: string;
}

export type ContactErrors = Record<string, "incomplete" | "invalid">;

export const newContactDraft = (): ContactDraft => ({
  key: crypto.randomUUID(),
  name: "",
  relationship: "",
  phone: "",
});

interface Props {
  contacts: ContactDraft[];
  errors: ContactErrors;
  onChange: (contacts: ContactDraft[]) => void;
}

export default function EmergencyContactsEditor({ contacts, errors, onChange }: Props) {
  const t = useTranslations("medicalProfile");
  const tRelationship = useTranslations("enums.contactRelationship");

  const update = (key: string, changes: Partial<ContactDraft>) =>
    onChange(contacts.map((contact) => (contact.key === key ? { ...contact, ...changes } : contact)));
  const remove = (key: string) => onChange(contacts.filter((contact) => contact.key !== key));

  return (
    <div className="flex flex-col gap-4">
      {contacts.map((contact, index) => {
        const error = errors[contact.key];
        return (
          <div
            key={contact.key}
            className="flex flex-col gap-3 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50/60 dark:bg-slate-950/40 p-4"
          >
            <div className="flex items-center justify-between gap-2">
              <p className="text-sm font-medium text-slate-900 dark:text-slate-100">
                {t("contactNumber", { number: index + 1 })}
                {index === 0 && contacts.length > 1 && (
                  <span className="ms-2 rounded-full bg-blue-50 dark:bg-blue-950/40 px-2 py-0.5 text-xs font-medium text-blue-700 dark:text-blue-300">
                    {t("primary")}
                  </span>
                )}
              </p>
              {contacts.length > 1 && (
                <button
                  type="button"
                  onClick={() => remove(contact.key)}
                  aria-label={t("removeContact")}
                  className="inline-flex items-center gap-1 text-xs cursor-pointer text-slate-500 hover:text-red-600 dark:text-slate-400 dark:hover:text-red-400 transition-colors"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                  {t("removeContact")}
                </button>
              )}
            </div>

            <div className="grid gap-3 sm:grid-cols-2">
              <label className="flex flex-col gap-1.5">
                <span className={LABEL_CLASS}>{t("contactName")}</span>
                <input
                  value={contact.name}
                  onChange={(e) => update(contact.key, { name: e.target.value })}
                  maxLength={MAX_CONTACT_NAME_LENGTH}
                  autoComplete="off"
                  className={FIELD_CLASS}
                />
              </label>
              <label className="flex flex-col gap-1.5">
                <span className={LABEL_CLASS}>{t("contactRelationship")}</span>
                <select
                  value={contact.relationship}
                  onChange={(e) => update(contact.key, { relationship: e.target.value as ContactRelationship | "" })}
                  className={`${FIELD_CLASS} cursor-pointer`}
                >
                  <option value="">{t("notSpecified")}</option>
                  {CONTACT_RELATIONSHIPS.map((relationship) => (
                    <option key={relationship} value={relationship}>{tRelationship(relationship)}</option>
                  ))}
                </select>
              </label>
              <div role="group" aria-label={t("contactPhone")} className="flex flex-col gap-1.5 sm:col-span-2 sm:max-w-sm">
                <span className={LABEL_CLASS}>{t("contactPhone")}</span>
                <PhoneField
                  noLabel
                  value={contact.phone}
                  onChange={(phone) => update(contact.key, { phone })}
                  error={error === "invalid"}
                />
              </div>
            </div>

            {error === "incomplete" && (
              <p role="alert" className="text-xs text-red-600 dark:text-red-400">{t("contactIncomplete")}</p>
            )}
          </div>
        );
      })}

      {contacts.length < MAX_EMERGENCY_CONTACTS && (
        <button
          type="button"
          onClick={() => onChange([...contacts, newContactDraft()])}
          className="inline-flex w-fit items-center gap-1.5 rounded-md border border-dashed border-slate-300 dark:border-slate-700 px-3 py-2 text-sm font-medium cursor-pointer text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors"
        >
          <Plus className="w-4 h-4" />
          {t("addContact")}
        </button>
      )}
    </div>
  );
}