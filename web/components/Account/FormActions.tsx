"use client";

import { useTranslations } from "next-intl";
import { Loader2 } from "lucide-react";

interface Props {
  submitLabel: string;
  pendingLabel: string;
  pending: boolean;
  disabled?: boolean;
  /** When provided, a secondary button is rendered (Cancel by default). */
  onCancel?: () => void;
  cancelLabel?: string;
}

/** Full-width stacked buttons on mobile, right-aligned inline buttons from `sm` up. */
export default function FormActions({
  submitLabel, pendingLabel, pending, disabled = false, onCancel, cancelLabel,
}: Props) {
  const tCommon = useTranslations("common");

  return (
    <div className="flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
      {onCancel && (
        <button
          type="button"
          onClick={onCancel}
          disabled={pending}
          className="w-full sm:w-auto px-4 py-2 text-sm font-medium rounded-md cursor-pointer border border-slate-300 dark:border-slate-700 text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors disabled:opacity-50"
        >
          {cancelLabel ?? tCommon("cancel")}
        </button>
      )}
      <button
        type="submit"
        disabled={pending || disabled}
        className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-4 py-2 text-sm font-medium rounded-md cursor-pointer bg-blue-600 text-white hover:bg-blue-700 transition-colors disabled:opacity-50"
      >
        {pending && <Loader2 className="w-4 h-4 animate-spin" />}
        {pending ? pendingLabel : submitLabel}
      </button>
    </div>
  );
}