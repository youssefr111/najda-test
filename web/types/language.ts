import type { Locale } from "@/lib/locale/config";

export type Language = {
  id: Locale;
  name: string;
  dir: "ltr" | "rtl";
};