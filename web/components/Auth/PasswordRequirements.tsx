"use client";

import { useTranslations } from "next-intl";
import { Check, X } from "lucide-react";
import { PASSWORD_RULES } from "@/lib/auth/password-rules";

export default function PasswordRequirements({ password }: { password: string }) {
  const t = useTranslations("auth.passwordRules");
  if (!password) return null;

  return (
    <ul className="flex flex-col gap-1 mt-1">
      {PASSWORD_RULES.map((rule) => {
        const met = rule.test(password);
        return (
          <li key={rule.id} className={`flex items-center gap-1.5 text-xs transition-colors ${met ? "text-emerald-600 dark:text-emerald-400" : "text-slate-400 dark:text-slate-500"}`}>
            {met ? <Check className="w-3.5 h-3.5 shrink-0" /> : <X className="w-3.5 h-3.5 shrink-0" />}
            {t(rule.id)}
          </li>
        );
      })}
    </ul>
  );
}