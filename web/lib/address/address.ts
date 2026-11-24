/** The 27 governorates of Egypt (codes match the backend's `Governorate` enum). */
export const GOVERNORATES = [
  { code: "CAIRO", en: "Cairo", ar: "القاهرة" },
  { code: "GIZA", en: "Giza", ar: "الجيزة" },
  { code: "ALEXANDRIA", en: "Alexandria", ar: "الإسكندرية" },
  { code: "DAKAHLIA", en: "Dakahlia", ar: "الدقهلية" },
  { code: "RED_SEA", en: "Red Sea", ar: "البحر الأحمر" },
  { code: "BEHEIRA", en: "Beheira", ar: "البحيرة" },
  { code: "FAYOUM", en: "Faiyum", ar: "الفيوم" },
  { code: "GHARBIA", en: "Gharbia", ar: "الغربية" },
  { code: "ISMAILIA", en: "Ismailia", ar: "الإسماعيلية" },
  { code: "MONUFIA", en: "Monufia", ar: "المنوفية" },
  { code: "MINYA", en: "Minya", ar: "المنيا" },
  { code: "QALYUBIA", en: "Qalyubia", ar: "القليوبية" },
  { code: "NEW_VALLEY", en: "New Valley", ar: "الوادي الجديد" },
  { code: "SUEZ", en: "Suez", ar: "السويس" },
  { code: "ASWAN", en: "Aswan", ar: "أسوان" },
  { code: "ASSIUT", en: "Assiut", ar: "أسيوط" },
  { code: "BENI_SUEF", en: "Beni Suef", ar: "بني سويف" },
  { code: "PORT_SAID", en: "Port Said", ar: "بورسعيد" },
  { code: "DAMIETTA", en: "Damietta", ar: "دمياط" },
  { code: "SHARKIA", en: "Sharqia", ar: "الشرقية" },
  { code: "SOUTH_SINAI", en: "South Sinai", ar: "جنوب سيناء" },
  { code: "KAFR_EL_SHEIKH", en: "Kafr El Sheikh", ar: "كفر الشيخ" },
  { code: "MATROUH", en: "Matrouh", ar: "مطروح" },
  { code: "LUXOR", en: "Luxor", ar: "الأقصر" },
  { code: "QENA", en: "Qena", ar: "قنا" },
  { code: "NORTH_SINAI", en: "North Sinai", ar: "شمال سيناء" },
  { code: "SOHAG", en: "Sohag", ar: "سوهاج" },
] as const;

/** What the server stores and returns (the structured part of an address). */
export interface AddressPayload {
  governorate: string;
  city: string;
  street: string;
  landmark: string | null;
}

/** What the form edits. */
export interface AddressValue {
  governorate: string;
  city: string;
  street: string;
  landmark: string;
}

export const EMPTY_ADDRESS: AddressValue = { governorate: "", city: "", street: "", landmark: "" };

export type AddressErrors = Partial<Record<keyof AddressValue, "required" | "tooShort" | "invalid">>;

// Letters (any script), digits, spaces and . , ' / # ( ) - and the Arabic comma; at least one letter.
// Identical to the backend rule, so a value that passes here is never rejected there.
const TEXT = /^(?=.*\p{L})[\p{L}\p{N} .,'/#()\-\u060C]+$/u;

export function validateAddress(a: AddressValue): AddressErrors {
  const errors: AddressErrors = {};
  const city = a.city.trim();
  const street = a.street.trim();
  const landmark = a.landmark.trim();

  if (!a.governorate) errors.governorate = "required";
  if (!city) errors.city = "required";
  else if (city.length < 2) errors.city = "tooShort";
  else if (!TEXT.test(city)) errors.city = "invalid";

  if (!street) errors.street = "required";
  else if (street.length < 3) errors.street = "tooShort";
  else if (!TEXT.test(street)) errors.street = "invalid";

  if (landmark && !TEXT.test(landmark)) errors.landmark = "invalid";
  return errors;
}

export const isAddressValid = (a: AddressValue) => Object.keys(validateAddress(a)).length === 0;

export function toAddressPayload(a: AddressValue): AddressPayload {
  return { governorate: a.governorate, city: a.city.trim(), street: a.street.trim(), landmark: a.landmark.trim() || null };
}

export function addressFromUser(user: { addressDetails?: AddressPayload | null }): AddressValue {
  const d = user.addressDetails;
  return d
    ? { governorate: d.governorate, city: d.city, street: d.street, landmark: d.landmark ?? "" }
    : EMPTY_ADDRESS;
}

/** "15 Tahrir St, Dokki, Giza - near Metro" for read-only views. */
export function formatAddress(details: AddressPayload | null | undefined, locale: string): string {
  if (!details) return "";
  const gov = GOVERNORATES.find((g) => g.code === details.governorate);
  const govName = gov ? (locale === "ar" ? gov.ar : gov.en) : "";
  const line = [details.street, details.city, govName].filter(Boolean).join(locale === "ar" ? "، " : ", ");
  return details.landmark ? `${line} - ${details.landmark}` : line;
}