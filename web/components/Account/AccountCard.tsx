import type { ReactNode } from "react";

interface Props {
  title: string;
  description?: string;
  /** Rendered at the end of the header, e.g. an Edit button. */
  action?: ReactNode;
  children: ReactNode;
}

export default function AccountCard({ title, description, action, children }: Props) {
  return (
    <section className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-sm">
      <header className="flex items-start justify-between gap-4 border-b border-slate-100 dark:border-slate-800 px-4 py-4 sm:px-6">
        <div className="min-w-0">
          <h2 className="text-base font-semibold text-slate-900 dark:text-slate-100">{title}</h2>
          {description && <p className="mt-0.5 text-sm text-slate-500 dark:text-slate-400">{description}</p>}
        </div>
        {action}
      </header>
      <div className="px-4 py-5 sm:px-6 sm:py-6">{children}</div>
    </section>
  );
}