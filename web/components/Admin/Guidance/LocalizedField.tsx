"use client";

import { LANGUAGES } from "@/lib/locale/languages";
import type { LocalizedText } from "@/types/guidance";

interface LocalizedFieldProps {
  label: string;
  value: LocalizedText;
  onChange: (next: LocalizedText) => void;
  multiline?: boolean;
  /** An optional text may stay entirely blank; only then is a blank translation not flagged. */
  optional?: boolean;
}

const FIELD =
  "w-full px-3 py-2 bg-white dark:bg-slate-800 border rounded-md text-sm text-slate-900 dark:text-slate-100";

/** One text, edited in every supported language side by side. Blank translations are outlined in red. */
export default function LocalizedField({ label, value, onChange, multiline = false, optional = false }: LocalizedFieldProps) {
  const allBlank = LANGUAGES.every(({ id }) => (value[id] ?? "").trim() === "");
  return (
    <fieldset className="flex flex-col gap-1.5">
      <legend className="mb-1 text-sm font-medium text-slate-700 dark:text-slate-300">{label}</legend>
      <div className="grid gap-2 md:grid-cols-2">
        {LANGUAGES.map(({ id, name, dir }) => {
          const text = value[id] ?? "";
          const className = `${FIELD} ${text.trim() === "" && !(optional && allBlank) ? "border-red-400 dark:border-red-500" : "border-slate-300 dark:border-slate-700"}`;
          const update = (next: string) => onChange({ ...value, [id]: next });
          return (
            <label key={id} className="flex flex-col gap-1">
              <span className="text-xs text-slate-500 dark:text-slate-400">{name}</span>
              {multiline ? (
                <textarea dir={dir} rows={3} value={text} onChange={(e) => update(e.target.value)} className={className} />
              ) : (
                <input dir={dir} value={text} onChange={(e) => update(e.target.value)} className={className} />
              )}
            </label>
          );
        })}
      </div>
    </fieldset>
  );
}
