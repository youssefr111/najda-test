import Link from "next/link";
import type { ReactNode } from "react";

/** `[label](/path)`: the only markup legal texts support, and only for pages of the app itself. */
const LINK = /\[([^\]]+)\]\((\/[A-Za-z0-9/_-]*)\)/g;

/** Turns `[Support](/support)` into a real link; everything else stays plain text (never HTML). */
export function renderInline(text: string): ReactNode[] {
  const nodes: ReactNode[] = [];
  let last = 0;
  for (const match of text.matchAll(LINK)) {
    const index = match.index ?? 0;
    if (index > last) nodes.push(text.slice(last, index));
    nodes.push(
      <Link key={index} href={match[2]} className="text-blue-600 hover:underline dark:text-blue-400">
        {match[1]}
      </Link>,
    );
    last = index + match[0].length;
  }
  if (last < text.length) nodes.push(text.slice(last));
  return nodes;
}
