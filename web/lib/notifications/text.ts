import type { NotificationsLocalizedText } from "@/types/notification";

/** The user's language, falling back to English. */
export function pickText(text: NotificationsLocalizedText, locale: string): string {
  return text[locale] ?? text.en ?? Object.values(text)[0] ?? "";
}

/** "5 minutes ago" / "منذ 5 دقائق", in the app language. */
export function timeAgo(iso: string, locale: string, now: number = Date.now()): string {
  const seconds = Math.round((new Date(iso).getTime() - now) / 1000);
  const formatter = new Intl.RelativeTimeFormat(locale, { numeric: "auto" });
  const steps: [Intl.RelativeTimeFormatUnit, number][] = [
    ["year", 31_536_000],
    ["month", 2_592_000],
    ["day", 86_400],
    ["hour", 3_600],
    ["minute", 60],
  ];
  for (const [unit, size] of steps) {
    if (Math.abs(seconds) >= size) return formatter.format(Math.round(seconds / size), unit);
  }
  return formatter.format(seconds, "second");
}
