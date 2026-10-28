import type { ReactNode } from "react";
import { DETAIL_LABEL_CLASS } from "./styles";

export const EMPTY_VALUE = "—";

export function DetailList({ children, className = "" }: { children: ReactNode; className?: string }) {
  return <dl className={`grid gap-x-8 gap-y-5 sm:grid-cols-2 ${className}`}>{children}</dl>;
}

/** A read-only label/value pair. Falsy values render as an em dash. */
export default function DetailItem({
  label, children, className = "",
}: { label: string; children?: ReactNode; className?: string }) {
  return (
    <div className={className}>
      <dt className={DETAIL_LABEL_CLASS}>{label}</dt>
      <dd className="mt-0.5 text-sm text-slate-900 dark:text-slate-100 wrap-break-word">{children || EMPTY_VALUE}</dd>
    </div>
  );
}