const EGYPT_MOBILE_REGEX = /^1[0125]\d{8}$/;

export function isValidEgyptianMobile(localDigits: string): boolean {
  return EGYPT_MOBILE_REGEX.test(localDigits);
}

export function toE164EgyptianPhone(localDigits: string): string {
  return `+20${localDigits}`;
}
