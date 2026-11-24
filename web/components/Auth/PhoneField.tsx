"use client";

import { useTranslations } from "next-intl";

const EGYPT_MOBILE_REGEX = /^1[0125]\d{8}$/;

export function isValidEgyptianMobile(localDigits: string): boolean {
  return EGYPT_MOBILE_REGEX.test(localDigits);
}

export function toE164EgyptianPhone(localDigits: string): string {
  return `+20${localDigits}`;
}

export default function PhoneField({
  value, onChange, error, noLabel = false, disabled = false,
}: { value: string; onChange: (v: string) => void; error?: boolean; noLabel?: boolean, disabled?: boolean }) {
  const t = useTranslations("auth.phone");

  return (
    <label className="flex flex-col gap-1.5">
      {noLabel || <span className="text-sm font-medium text-slate-700 dark:text-slate-300">{t("label")}</span>}
      <div className={`flex items-stretch rounded-md border ${error ? "border-red-400 dark:border-red-700" : "border-slate-300 dark:border-slate-700"} bg-white dark:bg-slate-800 overflow-hidden`}>
        <span className="flex items-center px-3 text-sm text-slate-500 dark:text-slate-400 bg-slate-50 dark:bg-slate-900 border-e border-slate-300 dark:border-slate-700 select-none">
          +20
        </span>
        <input
          type="tel"
          inputMode="numeric"
          dir="ltr"
          value={value}
          disabled={disabled}
          onChange={(e) => onChange(e.target.value.replace(/\D/g, "").slice(0, 10))}
          placeholder="1012345678"
          className="flex-1 min-w-0 px-3 py-2 text-sm text-slate-900 dark:text-slate-100 bg-transparent focus:outline-none text-start"
        />
      </div>
      {error && <p className="text-xs text-red-600 dark:text-red-400">{t("invalid")}</p>}
    </label>
  );
}