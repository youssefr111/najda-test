"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { useResetUnitLocation } from "@/hooks/units/useResetUnitLocation";

interface ResetLocationButtonProps {
  unitId: number;
  /** Runs once the server has moved the unit to its facility. */
  onReset: () => void;
}

export default function ResetLocationButton({ unitId, onReset }: ResetLocationButtonProps) {
  const t = useTranslations("shiftStatusCard");
  const tCommon = useTranslations("common");
  const [isConfirming, setIsConfirming] = useState(false);
  const { mutate, isPending, isError, error } = useResetUnitLocation();

  const handleConfirm = () =>
    mutate(unitId, {
      onSuccess: () => {
        setIsConfirming(false);
        onReset();
      },
    });

  if (!isConfirming) {
    return (
      <button
        type="button"
        onClick={() => setIsConfirming(true)}
        className="cursor-pointer text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 underline"
      >
        {t("resetToFacility")}
      </button>
    );
  }

  return (
    <>
      <span className="text-red-600 dark:text-red-400">{t("resetConfirm")}</span>
      <button
        type="button"
        onClick={handleConfirm}
        disabled={isPending}
        className="cursor-pointer font-medium text-red-600 dark:text-red-400 underline disabled:opacity-50"
      >
        {isPending ? t("resetting") : tCommon("confirm")}
      </button>
      <button
        type="button"
        onClick={() => setIsConfirming(false)}
        disabled={isPending}
        className="cursor-pointer text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 underline disabled:opacity-50"
      >
        {tCommon("cancel")}
      </button>
      {isError && (
        <span className="text-red-600 dark:text-red-400">
          {error instanceof Error ? error.message : t("resetError")}
        </span>
      )}
    </>
  );
}