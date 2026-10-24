"use client";

import AddressFields from "@/components/Shared/AddressFields";
import { addressFromUser, isAddressValid, toAddressPayload, type AddressValue } from "@/lib/address/address";
import { useState, type FormEvent } from "react";
import { useTranslations, useLocale } from "next-intl";
import { useUpdateProfile } from "@/hooks/users/useUpdateProfile";
import { resolveAuthError } from "@/lib/auth/errors";
import { formatAddress } from "@/lib/address/address";
import Field from "@/components/Auth/Field";
import type { Gender, User } from "@/types/user";
import AccountCard from "./AccountCard";
import DetailItem, { DetailList } from "./DetailItem";
import EditButton from "./EditButton";
import FormActions from "./FormActions";
import { FIELD_CLASS, LABEL_CLASS } from "./styles";

export default function PersonalInfoCard({ user }: { user: User }) {
  const t = useTranslations("account");
  const tGender = useTranslations("enums.gender");
  const locale = useLocale();
  const [isEditing, setIsEditing] = useState(false);

  return (
    <AccountCard
      title={t("personalInfo.title")}
      description={t("personalInfo.description")}
      action={!isEditing && <EditButton onClick={() => setIsEditing(true)} />}
    >
      {isEditing ? (
        <PersonalInfoForm user={user} onDone={() => setIsEditing(false)} />
      ) : (
        <DetailList>
          <DetailItem label={t("firstName")}>{user.firstName}</DetailItem>
          <DetailItem label={t("lastName")}>{user.lastName}</DetailItem>
          <DetailItem label={tGender("label")}>{user.gender && tGender(user.gender)}</DetailItem>
          <DetailItem label={t("address")}>{formatAddress(user.addressDetails, locale)}</DetailItem>
        </DetailList>
      )}
    </AccountCard>
  );
}

function PersonalInfoForm({ user, onDone }: { user: User; onDone: () => void }) {
  const t = useTranslations("account");
  const tGender = useTranslations("enums.gender");
  const tErrors = useTranslations("auth.errors");
  const updateProfile = useUpdateProfile(user.id);

  const [firstName, setFirstName] = useState(user.firstName);
  const [lastName, setLastName] = useState(user.lastName);
  const [address, setAddress] = useState<AddressValue>(addressFromUser(user));
  const [showAddressErrors, setShowAddressErrors] = useState(false);
  const [gender, setGender] = useState<Gender>(user.gender ?? "MALE");

  function handleSubmit(e: FormEvent) {
    e.preventDefault();
    if (!isAddressValid(address)) {
      setShowAddressErrors(true);
      return;
    }
    updateProfile.mutate(
      { firstName: firstName.trim(), lastName: lastName.trim(), addressDetails: toAddressPayload(address), gender },
      { onSuccess: onDone },
    );
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-5">
      <div className="grid gap-4 sm:grid-cols-2">
        <Field label={t("firstName")} value={firstName} onChange={setFirstName} autoComplete="given-name" required />
        <Field label={t("lastName")} value={lastName} onChange={setLastName} autoComplete="family-name" required />
        <div className="sm:col-span-2">
          <AddressFields value={address} onChange={setAddress} showErrors={showAddressErrors} />
        </div>
        <label className="flex flex-col gap-1.5">
          <span className={LABEL_CLASS}>{tGender("label")}</span>
          <select
            value={gender}
            onChange={(e) => setGender(e.target.value as Gender)}
            className={`${FIELD_CLASS} cursor-pointer`}
          >
            <option value="MALE">{tGender("MALE")}</option>
            <option value="FEMALE">{tGender("FEMALE")}</option>
          </select>
        </label>
      </div>

      {updateProfile.isError && (
        <p role="alert" className="text-sm text-red-600 dark:text-red-400">
          {resolveAuthError(updateProfile.error, tErrors)}
        </p>
      )}

      <FormActions
        submitLabel={t("saveChanges")}
        pendingLabel={t("saving")}
        pending={updateProfile.isPending}
        disabled={!firstName.trim() || !lastName.trim()}
        onCancel={onDone}
      />
    </form>
  );
}