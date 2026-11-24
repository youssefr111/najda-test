"use client";

import { useId } from "react";
import { MAX_NOTES_LENGTH } from "@/types/medicalProfile";
import { FIELD_CLASS, LABEL_CLASS } from "./styles";

interface Props<T extends string> {
  legend: string;
  noneLabel: string;
  noneChecked: boolean;
  onNoneChange: (checked: boolean) => void;
  options: readonly T[];
  selected: T[];
  getLabel: (option: T) => string;
  onToggle: (option: T) => void;
  notesLabel: string;
  notesPlaceholder: string;
  notes: string;
  onNotesChange: (value: string) => void;
}

/**
 * Quick-pick chips plus a free-text "other" box, with an explicit "none known" switch.
 * "None known" matters: an empty list alone only says nothing was provided.
 */
export default function MedicalHistorySection<T extends string>({
  legend, noneLabel, noneChecked, onNoneChange,
  options, selected, getLabel, onToggle,
  notesLabel, notesPlaceholder, notes, onNotesChange,
}: Props<T>) {
  const headingId = useId();

  return (
    <section className="flex flex-col gap-3">
      <div className="flex flex-wrap items-center justify-between gap-x-4 gap-y-2">
        <h3 id={headingId} className={LABEL_CLASS}>{legend}</h3>
        <label className="inline-flex items-center gap-2 text-sm text-slate-600 dark:text-slate-300 cursor-pointer">
          <input
            type="checkbox"
            checked={noneChecked}
            onChange={(e) => onNoneChange(e.target.checked)}
            className="size-4 accent-blue-600 cursor-pointer"
          />
          {noneLabel}
        </label>
      </div>

      {/* A disabled fieldset disables every control inside it. */}
      <fieldset
        disabled={noneChecked}
        aria-labelledby={headingId}
        className={`flex flex-col gap-3 transition-opacity ${noneChecked ? "opacity-50" : ""}`}
      >
        <div className="flex flex-wrap gap-2">
          {options.map((option) => {
            const active = selected.includes(option);
            return (
              <button
                key={option}
                type="button"
                aria-pressed={active}
                onClick={() => onToggle(option)}
                className={`rounded-full border px-3 py-1.5 text-sm cursor-pointer transition-colors disabled:cursor-not-allowed ${
                  active
                    ? "border-blue-600 bg-blue-600 text-white"
                    : "border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700"
                }`}
              >
                {getLabel(option)}
              </button>
            );
          })}
        </div>

        <label className="flex flex-col gap-1.5">
          <span className="text-xs text-slate-500 dark:text-slate-400">{notesLabel}</span>
          <textarea
            value={notes}
            onChange={(e) => onNotesChange(e.target.value)}
            maxLength={MAX_NOTES_LENGTH}
            rows={2}
            placeholder={notesPlaceholder}
            className={`${FIELD_CLASS} resize-y`}
          />
        </label>
      </fieldset>
    </section>
  );
}