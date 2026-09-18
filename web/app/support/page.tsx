"use client";

import { useLocale, useTranslations } from "next-intl";
import { useState } from "react";
import emailjs from "@emailjs/browser";
import { LANGUAGES } from "@/lib/locale/languages";

export default function SupportPage() {
  const t = useTranslations("support");
  const locale = useLocale();
  const dir = LANGUAGES.find(l => l.id === locale)?.dir ?? "ltr";
  const [form, setForm] = useState({ name: "", email: "", message: "" });
  const [status, setStatus] = useState<"idle" | "sending" | "sent" | "error">("idle");

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setStatus("sending");
    try {
      await emailjs.send(
        process.env.NEXT_PUBLIC_EMAILJS_SERVICE_ID!,
        process.env.NEXT_PUBLIC_EMAILJS_TEMPLATE_ID!,
        { from_name: form.name, from_email: form.email, message: form.message },
        process.env.NEXT_PUBLIC_EMAILJS_PUBLIC_KEY!
      );
      setStatus("sent");
      setForm({ name: "", email: "", message: "" });
    } catch {
      setStatus("error");
    }
  }

  return (
    <main className="max-w-lg mx-auto px-4 py-12" dir={dir}>
      <h1 className="text-xl font-semibold text-slate-900 dark:text-slate-100 mb-1">{t("title")}</h1>
      <p className="text-sm text-slate-500 dark:text-slate-400 mb-6">{t("description")}</p>

      {status === "sent" ? (
        <p className="text-sm text-emerald-600 dark:text-emerald-400">{t("success")}</p>
      ) : (
        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          <label className="flex flex-col gap-1.5">
            <span className="text-sm font-medium text-slate-700 dark:text-slate-300">{t("fullname")}</span>
            <input value={form.name} onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))} required className="px-3 py-2 border border-slate-300 dark:border-slate-700 rounded-md text-sm bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100" />
          </label>
          <label className="flex flex-col gap-1.5">
            <span className="text-sm font-medium text-slate-700 dark:text-slate-300">{t("Email address")}</span>
            <input type="email" value={form.email} onChange={(e) => setForm((f) => ({ ...f, email: e.target.value }))} required className="px-3 py-2 border border-slate-300 dark:border-slate-700 rounded-md text-sm bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100" />
          </label>
          <label className="flex flex-col gap-1.5">
            <span className="text-sm font-medium text-slate-700 dark:text-slate-300">{t("message")}</span>
            <textarea value={form.message} onChange={(e) => setForm((f) => ({ ...f, message: e.target.value }))} required rows={5} className="px-3 py-2 border border-slate-300 dark:border-slate-700 rounded-md text-sm bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100" />
          </label>
          {status === "error" && <p className="text-sm text-red-600 dark:text-red-400">{t("error")}</p>}
          <button type="submit" disabled={status === "sending"} className="py-2.5 bg-blue-600 text-white text-sm font-medium rounded-md disabled:opacity-50">
            {status === "sending" ? t("sending") : t("send")}
          </button>
        </form>
      )}
    </main>
  );
}