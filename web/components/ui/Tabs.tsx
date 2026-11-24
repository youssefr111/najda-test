"use client";

import { useId, useRef, type KeyboardEvent, type ReactNode } from "react";
import { useLocale } from "next-intl";
import type { LucideIcon } from "lucide-react";
import { LANGUAGES } from "@/lib/locale/languages";

export interface TabItem<T extends string> {
  id: T;
  label: string;
  icon?: LucideIcon;
  content: ReactNode;
}

interface Props<T extends string> {
  tabs: readonly TabItem<T>[];
  value: T;
  onChange: (id: T) => void;
  /** Accessible name for the tab list. */
  label: string;
}

/**
 * Accessible tabs (WAI-ARIA tabs pattern): roving tabindex plus arrow, Home and
 * End keys, with the arrows mirrored in RTL. Every panel stays mounted and is
 * only hidden, so unsaved form input survives a tab switch.
 */
export default function Tabs<T extends string>({ tabs, value, onChange, label }: Props<T>) {
  const baseId = useId();
  const locale = useLocale();
  const isRtl = LANGUAGES.find((language) => language.id === locale)?.dir === "rtl";
  const tabRefs = useRef<Partial<Record<T, HTMLButtonElement | null>>>({});

  const tabId = (id: T) => `${baseId}-tab-${id}`;
  const panelId = (id: T) => `${baseId}-panel-${id}`;

  function handleKeyDown(e: KeyboardEvent<HTMLDivElement>) {
    const last = tabs.length - 1;
    const current = tabs.findIndex((tab) => tab.id === value);
    const nextKey = isRtl ? "ArrowLeft" : "ArrowRight";
    const previousKey = isRtl ? "ArrowRight" : "ArrowLeft";

    let target: number;
    if (e.key === nextKey) target = current === last ? 0 : current + 1;
    else if (e.key === previousKey) target = current === 0 ? last : current - 1;
    else if (e.key === "Home") target = 0;
    else if (e.key === "End") target = last;
    else return;

    e.preventDefault();
    const { id } = tabs[target];
    onChange(id);
    tabRefs.current[id]?.focus();
  }

  return (
    <div className="flex flex-col gap-6">
      <div
        role="tablist"
        aria-label={label}
        onKeyDown={handleKeyDown}
        className="grid grid-flow-col auto-cols-fr gap-1 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-100 dark:bg-slate-900 p-1 sm:w-fit sm:auto-cols-auto"
      >
        {tabs.map(({ id, label: tabLabel, icon: Icon }) => {
          const selected = id === value;
          return (
            <button
              key={id}
              ref={(element) => {
                tabRefs.current[id] = element;
              }}
              type="button"
              role="tab"
              id={tabId(id)}
              aria-selected={selected}
              aria-controls={panelId(id)}
              tabIndex={selected ? 0 : -1}
              onClick={() => onChange(id)}
              className={`flex flex-col items-center justify-center gap-1 rounded-lg px-3 py-2 text-xs font-medium cursor-pointer transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-500 sm:flex-row sm:gap-2 sm:px-4 sm:text-sm ${
                selected
                  ? "bg-white dark:bg-slate-800 text-blue-700 dark:text-blue-300 shadow-sm"
                  : "text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-200"
              }`}
            >
              {Icon && <Icon className="w-4 h-4 shrink-0" />}
              <span className="truncate">{tabLabel}</span>
            </button>
          );
        })}
      </div>

      {tabs.map(({ id, content }) => (
        <div
          key={id}
          role="tabpanel"
          id={panelId(id)}
          aria-labelledby={tabId(id)}
          className={id === value ? "flex flex-col gap-6" : "hidden"}
        >
          {content}
        </div>
      ))}
    </div>
  );
}