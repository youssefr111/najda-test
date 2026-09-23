"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { Copy, Check } from "lucide-react";

export default function GeneratedLinkBox({ link }: { link: string }) {
  const t = useTranslations("generatedLink");
  const [copied, setCopied] = useState(false);

  async function handleCopy() {
    await navigator.clipboard.writeText(link);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  return (
    <div className="flex flex-col gap-2 mt-2 p-3 rounded-md bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700">
      <p className="text-xs text-slate-500 dark:text-slate-400">{t("notice")}</p>
      <div className="flex gap-2">
        <input
          readOnly
          dir="ltr"
          value={link}
          onFocus={(e) => e.target.select()}
          className="flex-1 min-w-0 px-2 py-1.5 text-xs bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 rounded font-mono truncate text-start"
        />
        <button
          type="button"
          onClick={handleCopy}
          className="shrink-0 flex items-center gap-1 px-2.5 py-1.5 text-xs font-medium bg-slate-900 dark:bg-slate-100 text-white dark:text-slate-900 rounded hover:opacity-90 transition-opacity"
        >
          {copied ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
          {copied ? t("copied") : t("copy")}
        </button>
      </div>
    </div>
  );
}