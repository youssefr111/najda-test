"use client";

import { useEffect, useId } from "react";
import { useTranslations } from "next-intl";

export type ConfirmDialogProps = {
  title: string;
  description: string;
  confirmLabel: string;
  tone?: "default" | "danger";
  onConfirm: () => void;
  onCancel: () => void;
};

const CONFIRM_TONES = {
  default: "bg-blue-600 hover:bg-blue-700 focus-visible:ring-blue-500",
  danger: "bg-red-600 hover:bg-red-700 focus-visible:ring-red-500",
} as const;

export default function ConfirmDialog({ title, description, confirmLabel, tone = "default", onConfirm, onCancel }: ConfirmDialogProps) {
  const tCommon = useTranslations("common");
  const titleId = useId();
  const descriptionId = useId();

  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      if (e.key === "Escape") onCancel();
    }
    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [onCancel]);

  return (
    // stopPropagation: React events bubble through the component tree, so without it
    // a backdrop click would also reach a parent modal's own backdrop handler and close it.
    <div
      className="fixed inset-0 z-70 flex items-end sm:items-center justify-center bg-black/40 p-0 sm:p-4"
      onClick={(e) => {
        e.stopPropagation();
        onCancel();
      }}
    >
      <div
        role="alertdialog"
        aria-modal="true"
        aria-labelledby={titleId}
        aria-describedby={descriptionId}
        onClick={(e) => e.stopPropagation()}
        className="w-full sm:max-w-sm bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-t-2xl sm:rounded-xl shadow-xl p-5"
      >
        <h3 id={titleId} className="text-base font-semibold text-slate-900 dark:text-slate-100">
          {title}
        </h3>
        <p id={descriptionId} className="mt-2 text-sm text-slate-500 dark:text-slate-400">
          {description}
        </p>

        <div className="mt-5 flex justify-end gap-2">
          <button
            type="button"
            autoFocus
            onClick={onCancel}
            className="cursor-pointer rounded-md border border-slate-300 px-3 py-2 text-sm font-medium text-slate-700 transition-colors hover:bg-slate-50 focus:outline-none focus-visible:ring-2 focus-visible:ring-slate-400 dark:border-slate-700 dark:text-slate-200 dark:hover:bg-slate-800"
          >
            {tCommon("cancel")}
          </button>
          <button
            type="button"
            onClick={onConfirm}
            className={`cursor-pointer rounded-md px-3 py-2 text-sm font-medium text-white transition-colors focus:outline-none focus-visible:ring-2 ${CONFIRM_TONES[tone]}`}
          >
            {confirmLabel}
          </button>
        </div>
      </div>
    </div>
  );
}