"use client";

import { useLocale, useTranslations } from "next-intl";
import { GOVERNORATES, validateAddress, type AddressValue } from "@/lib/address/address";
import { FIELD_CLASS, LABEL_CLASS } from "@/components/Account/styles";

/**
 * The structured address (governorate, city, street, landmark), the same on every form that asks for one.
 * Errors appear once `showErrors` is true (after the first submit attempt), not while someone is still typing.
 */
export default function AddressFields({
  value,
  onChange,
  showErrors = false,
  disabled = false,
}: {
  value: AddressValue;
  onChange: (next: AddressValue) => void;
  showErrors?: boolean;
  disabled?: boolean;
}) {
  const t = useTranslations("address");
  const locale = useLocale();
  const errors = showErrors ? validateAddress(value) : {};
  const set = (patch: Partial<AddressValue>) => onChange({ ...value, ...patch });

  const error = (field: keyof AddressValue) =>
    errors[field] ? (
      <span role="alert" className="text-xs text-red-600 dark:text-red-400">
        {t(`errors.${errors[field]}`)}
      </span>
    ) : null;

  return (
    <div className="grid gap-4 sm:grid-cols-2">
      <label className="flex flex-col gap-1.5">
        <span className={LABEL_CLASS}>{t("governorate")}</span>
        <select
          value={value.governorate}
          onChange={(e) => set({ governorate: e.target.value })}
          disabled={disabled}
          required
          autoComplete="address-level1"
          className={`${FIELD_CLASS} cursor-pointer`}
        >
          <option value="">{t("governoratePlaceholder")}</option>
          {GOVERNORATES.map((g) => (
            <option key={g.code} value={g.code}>{locale === "ar" ? g.ar : g.en}</option>
          ))}
        </select>
        {error("governorate")}
      </label>

      <label className="flex flex-col gap-1.5">
        <span className={LABEL_CLASS}>{t("city")}</span>
        <input
          value={value.city}
          onChange={(e) => set({ city: e.target.value })}
          disabled={disabled}
          required
          maxLength={100}
          placeholder={t("cityPlaceholder")}
          autoComplete="address-level2"
          className={FIELD_CLASS}
        />
        {error("city")}
      </label>

      <label className="flex flex-col gap-1.5 sm:col-span-2">
        <span className={LABEL_CLASS}>{t("street")}</span>
        <input
          value={value.street}
          onChange={(e) => set({ street: e.target.value })}
          disabled={disabled}
          required
          maxLength={200}
          placeholder={t("streetPlaceholder")}
          autoComplete="street-address"
          className={FIELD_CLASS}
        />
        {error("street")}
      </label>

      <label className="flex flex-col gap-1.5 sm:col-span-2">
        <span className={LABEL_CLASS}>
          {t("landmark")} <span className="font-normal text-slate-400">({t("optional")})</span>
        </span>
        <input
          value={value.landmark}
          onChange={(e) => set({ landmark: e.target.value })}
          disabled={disabled}
          maxLength={200}
          placeholder={t("landmarkPlaceholder")}
          className={FIELD_CLASS}
        />
        {error("landmark")}
      </label>
    </div>
  );
}
