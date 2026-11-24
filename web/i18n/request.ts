import { getRequestConfig } from "next-intl/server";
import { cookies } from "next/headers";
import { DEFAULT_LOCALE, SUPPORTED_LOCALES, type Locale, LOCALE_COOKIE} from "@/lib/locale/config";

export default getRequestConfig(async () => {
  const cookieStore = await cookies();
  const stored = cookieStore.get(LOCALE_COOKIE)?.value;
  const locale: Locale = SUPPORTED_LOCALES.includes(stored as Locale) ? (stored as Locale) : DEFAULT_LOCALE;

  return {
    locale,
    messages: (await import(`../messages/${locale}.json`)).default,
  };
});