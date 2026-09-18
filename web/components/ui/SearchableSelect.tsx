"use client";

import { useState, useRef, useEffect } from "react";
import { useTranslations } from "next-intl";
import { ChevronDown } from "lucide-react";

export interface SearchableOption {
  value: number;
  label: string;
  hint?: string;
}

export default function SearchableSelect({
  options, value, onChange, placeholder, searchPlaceholder, disabled, className = "", highlightSelected = true, showNone = true, showHint = true, showSearch = true,
}: {
  options: SearchableOption[];
  value: number | null;
  onChange: (value: number | null) => void;
  placeholder?: string;
  searchPlaceholder?: string;
  disabled?: boolean;
  className?: string;
  highlightSelected?: boolean;
  showNone?: boolean;
  showHint?: boolean;
  showSearch?: boolean;
}) {
  const t = useTranslations("searchableSelect");
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const containerRef = useRef<HTMLDivElement>(null);
  const selected = options.find((o) => o.value === value) ?? null;

  const resolvedPlaceholder = placeholder ?? t("select");
  const resolvedSearchPlaceholder = searchPlaceholder ?? t("typeToSearch");

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setOpen(false);
        setQuery("");
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const filtered = options.filter((o) => o.label.toLowerCase().includes(query.toLowerCase()));

  return (
    <div className={`relative ${className}`} ref={containerRef}>
      <button type="button" disabled={disabled} onClick={() => setOpen((v) => !v)} className="w-full flex items-center justify-between px-3 py-2 bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 text-slate-900 dark:text-slate-100 rounded-md text-sm disabled:opacity-50">
        <span className={selected ? "" : "text-slate-400"}>{selected ? selected.label : resolvedPlaceholder}</span>
        <ChevronDown className="w-4 h-4 text-slate-400 shrink-0" />
      </button>

      {open && (
        <div className="absolute z-60 mt-1 w-full bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-md shadow-lg max-h-56 overflow-y-auto">
          {showSearch && (
            <input autoFocus value={query} onChange={(e) => setQuery(e.target.value)} placeholder={resolvedSearchPlaceholder} className="w-full px-3 py-2 text-sm border-b border-slate-200 dark:border-slate-700 bg-transparent text-slate-900 dark:text-slate-100 focus:outline-none" />
          )}
          {showNone && (
            <button type="button" onClick={() => { onChange(null); setOpen(false); setQuery(""); }} className="w-full text-left px-3 py-2 text-sm text-slate-400 dark:text-slate-500 hover:bg-slate-50 dark:hover:bg-slate-700">{t("none")}</button>
          )}
          {filtered.length === 0 ? (
            <p className="px-3 py-2 text-sm text-slate-400 dark:text-slate-500">{t("noMatches")}</p>
          ) : (
            filtered.map((o) => {
              const isSelected = o.value === value;
              return (
                <button key={o.value} type="button" onClick={() => { onChange(o.value); setOpen(false); setQuery(""); }} className={`w-full cursor-pointer text-left px-3 py-2 text-sm hover:bg-slate-50 dark:hover:bg-slate-700 ${highlightSelected && isSelected ? "bg-blue-50 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300 font-medium" : "text-slate-900 dark:text-slate-100"}`}>
                  {o.label}{showHint && o.hint && <span className="text-xs text-slate-400 ms-1.5">{o.hint}</span>}
                </button>
              );
            })
          )}
        </div>
      )}
    </div>
  );
}