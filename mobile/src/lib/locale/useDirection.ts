import { useLanguageStore } from "@/store/language-store";
import { isRtl } from "./languages";

export type Direction = "ltr" | "rtl";

/**
 * The current language's natural reading direction -- read once, then pass
 * it explicitly to whatever you want it applied to, the same way you'd use
 * a `dir` variable with web's `dir={dir}` attribute. The app's own chrome
 * (tab bar, back button, navigation) never reads this and stays LTR always
 * -- this is only for the specific fields/components you choose to apply
 * it to yourself, via <Directional dir={dir}>...</Directional> or your own
 * conditional styling.
 *
 *   const dir = useDirection();
 *   <Directional dir={dir}><Text>{translatedParagraph}</Text></Directional>
 */
export function useDirection(): Direction {
  const locale = useLanguageStore((s) => s.locale);
  return isRtl(locale) ? "rtl" : "ltr";
}
