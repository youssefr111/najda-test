import type { useTranslations } from "next-intl";

type ErrorTranslator = ReturnType<typeof useTranslations<"auth.errors">>;

export function mapFirebaseAuthError(code: string, t: ErrorTranslator): string {
  switch (code) {
    case "auth/invalid-credential":
    case "auth/wrong-password":
    case "auth/user-not-found":
      return t("invalidCredential");
    case "auth/too-many-requests":
      return t("tooManyRequests");
    case "auth/user-disabled":
      return t("userDisabled");
    case "auth/email-already-in-use":
      return t("emailAlreadyInUse");
    case "auth/weak-password":
      return t("weakPassword");
    case "auth/popup-closed-by-user":
      return "";

    case "auth/invalid-phone-number":
      return t("invalidPhoneNumber");
    case "auth/missing-phone-number":
      return t("missingPhoneNumber");
    case "auth/invalid-verification-code":
      return t("invalidVerificationCode");
    case "auth/missing-verification-code":
      return t("missingVerificationCode");
    case "auth/code-expired":
      return t("codeExpired");
    case "auth/credential-already-in-use":
      return t("credentialAlreadyInUse");
    case "auth/provider-already-linked":
      return t("providerAlreadyLinked");
    case "auth/captcha-check-failed":
      return t("captchaCheckFailed");
    case "auth/invalid-app-credential":
      return t("invalidAppCredential");
    case "auth/quota-exceeded":
      return t("quotaExceeded");
    case "auth/network-request-failed":
      return t("networkRequestFailed");

    default:
      console.warn(`Unmapped Firebase auth error code: ${code}`);
      return t("generic");
  }
}