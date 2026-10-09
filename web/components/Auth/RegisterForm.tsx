"use client";

import { useRef, useState, type FormEvent } from "react";
import Link from "next/link";
import { useTranslations } from "next-intl";
import { getAdditionalUserInfo, signInWithEmailAndPassword, signInWithPopup, GoogleAuthProvider } from "firebase/auth";
import { useRouter } from "next/navigation";
import { Check, Loader2 } from "lucide-react";
import { resolveAuthError } from "@/lib/auth/errors";
import { isPasswordValid } from "@/lib/auth/password-rules";
import { firebaseAuth } from "@/lib/firebase/client";
import { registerCitizenBootstrap } from "@/lib/auth/registerCitizenBootstrap";
import { registerCitizenWithPassword } from "@/lib/auth/emailOtp";
import { establishSession } from "@/lib/auth/establishSession";
import { useEmailAvailability } from "@/hooks/auth/useEmailAvailability";
import { useEmailOtp } from "@/hooks/auth/useEmailOtp";
import Field from "./Field";
import GoogleIcon from "./GoogleIcon";
import LogoStacked from "../ui/LogoStacked";
import PasswordRequirements from "./PasswordRequirements";
import PhoneField, { isValidEgyptianMobile, toE164EgyptianPhone } from "./PhoneField";
import type { Gender } from "@/types/user";

function splitDisplayName(displayName: string | null): { firstName: string; lastName: string } {
  if (!displayName) return { firstName: "", lastName: "" };
  const [firstName, ...rest] = displayName.trim().split(/\s+/);
  return { firstName: firstName ?? "", lastName: rest.join(" ") };
}

/** Reads an HTTP status off whatever error apiFetch throws (if it carries one). */
function statusOf(err: unknown): number | undefined {
  if (typeof err === "object" && err !== null && "status" in err) {
    const status = (err as { status: unknown }).status;
    if (typeof status === "number") return status;
  }
  return undefined;
}

const secondaryButton =
  "w-full flex items-center justify-center gap-2 py-2.5 cursor-pointer border border-slate-300 dark:border-slate-700 rounded-md text-sm font-medium text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors disabled:opacity-50";

const selectClass =
  "w-full px-3 py-2 bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 text-slate-900 dark:text-slate-100 rounded-md text-sm";

export default function RegisterForm() {
  const t = useTranslations("auth.register");
  const tErrors = useTranslations("auth.errors");
  const router = useRouter();
  const otp = useEmailOtp();

  const termsRef = useRef<HTMLInputElement>(null);

  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [email, setEmail] = useState("");
  const [code, setCode] = useState("");
  const [localPhone, setLocalPhone] = useState("");
  const [phoneInvalid, setPhoneInvalid] = useState(false);
  const [address, setAddress] = useState("");
  const [gender, setGender] = useState<Gender>("MALE");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [agreedToTerms, setAgreedToTerms] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const emailAvailability = useEmailAvailability(email);
  const emailTrimmed = email.trim();
  const busy = loading || otp.pending;

  /** Prefers a specific message for known HTTP statuses, else falls back to the shared resolver. */
  function describeError(err: unknown, byStatus: Partial<Record<number, string>>): string {
    const status = statusOf(err);
    return (status !== undefined && byStatus[status]) || resolveAuthError(err, tErrors);
  }

  function handleEmailChange(value: string) {
    setEmail(value);
    setCode("");
    otp.reset();
  }

  function handlePhoneChange(value: string) {
    setLocalPhone(value);
    setPhoneInvalid(false);
  }

  async function handleSendCode() {
    setError(null);
    try {
      await otp.send(emailTrimmed);
      setCode("");
    } catch (err) {
      setError(
        describeError(err, {
          409: t("emailAlreadyRegistered"),
          429: t("tooManyRequests"),
          503: t("emailServiceUnavailable"),
        }),
      );
    }
  }

  async function handleVerifyCode() {
    setError(null);
    try {
      await otp.verify(emailTrimmed, code.trim());
    } catch (err) {
      setError(describeError(err, { 400: t("invalidCode"), 429: t("tooManyAttempts") }));
    }
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);

    if (!agreedToTerms) return setError(t("agreeRequired"));
    if (otp.status !== "verified" || !otp.verificationToken) return setError(t("verifyEmailFirst"));
    if (!isValidEgyptianMobile(localPhone)) {
      setPhoneInvalid(true);
      return setError(t("phoneInvalid"));
    }
    if (!isPasswordValid(password)) return setError(t("passwordInvalid"));
    if (password !== confirmPassword) return setError(t("passwordMismatch"));

    setLoading(true);
    try {
      await registerCitizenWithPassword({
        firstName: firstName.trim(),
        lastName: lastName.trim(),
        email: emailTrimmed,
        password,
        verificationToken: otp.verificationToken,
        phone: toE164EgyptianPhone(localPhone),
        address: address.trim(),
        gender,
      });
      await signInWithEmailAndPassword(firebaseAuth, emailTrimmed.toLowerCase(), password);
      await establishSession(tErrors("sessionFailed"));
      router.push("/");
    } catch (err) {
      if (statusOf(err) === 403) otp.reset(); // verification expired: start over
      setError(
        describeError(err, {
          403: t("verificationExpired"),
          409: t("emailAlreadyRegistered"),
          422: t("phoneAlreadyUsed"),
        }),
      );
    } finally {
      setLoading(false);
    }
  }

  async function handleGoogleSignIn() {
    setError(null);
    setLoading(true);

    let credential: Awaited<ReturnType<typeof signInWithPopup>> | null = null;
    let registeredWithBackend = false;

    try {
      const provider = new GoogleAuthProvider();
      provider.setCustomParameters({
        prompt: "select_account",
      });
      credential = await signInWithPopup(firebaseAuth, provider);
      const isNewUser = getAdditionalUserInfo(credential)?.isNewUser;

      if (!isNewUser) {
        // Existing account -- just log them in.
        await establishSession(tErrors("sessionFailed"));
        router.push("/");
        return;
      }

      const { firstName: gFirst, lastName: gLast } = splitDisplayName(credential.user.displayName);
      await registerCitizenBootstrap({
        firstName: gFirst,
        lastName: gLast,
        email: credential.user.email ?? "",
        provider: "google",
      });
      registeredWithBackend = true;

      await establishSession(tErrors("sessionFailed"));
      router.push("/");
    } catch (err) {
      // Only delete a user this exact call just created -- never one we
      // merely signed into. Re-derive from `credential`, not ambient
      // firebaseAuth.currentUser, so a race elsewhere can't cause us to
      // delete the wrong session.
      const isNewUser = credential ? getAdditionalUserInfo(credential)?.isNewUser : false;
      if (!registeredWithBackend && isNewUser) {
        await credential?.user.delete().catch(() => null);
      }
      setError(resolveAuthError(err, tErrors));
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="min-h-screen flex items-center justify-center bg-slate-50 dark:bg-slate-950 px-4 py-12 transition-colors">
      <div className="w-full max-w-md">
        <div className="flex flex-col items-center text-center mb-8">
          <LogoStacked width={56} height={56} className="mb-2" />
          <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">{t("subtitle")}</p>
        </div>

        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-6 shadow-sm">
          <button type="button" onClick={handleGoogleSignIn} disabled={busy} className={secondaryButton}>
            <GoogleIcon />
            {t("continueWithGoogle")}
          </button>
          <p className="mt-2 text-sm text-center text-slate-500 dark:text-slate-400">
            By continuing with Google, you agree to our{" "}
            <Link
              href="/terms"
              target="_blank"
              className="text-blue-600 dark:text-blue-400 hover:underline"
            >
              Terms of Service
            </Link>{" "}
            and{" "}
            <Link
              href="/privacy"
              target="_blank"
              className="text-blue-600 dark:text-blue-400 hover:underline"
            >
              Privacy Policy
            </Link>
            .
          </p>

          <div className="flex items-center gap-3 my-5">
            <div className="h-px flex-1 bg-slate-200 dark:bg-slate-800" />
            <span className="text-xs text-slate-400 dark:text-slate-500 uppercase tracking-wide">{t("or")}</span>
            <div className="h-px flex-1 bg-slate-200 dark:bg-slate-800" />
          </div>

          <form onSubmit={handleSubmit} className="flex flex-col gap-4">
            <div className="grid grid-cols-2 gap-3">
              <Field label={t("firstNameLabel")} value={firstName} onChange={setFirstName} autoComplete="given-name" required />
              <Field label={t("lastNameLabel")} value={lastName} onChange={setLastName} autoComplete="family-name" required />
            </div>

            <Field label={t("emailLabel")} type="email" value={email} onChange={handleEmailChange} autoComplete="email" required />

            {emailAvailability === "taken" && (
              <p className="text-sm text-red-600 dark:text-red-400">{t("emailAlreadyRegistered")}</p>
            )}

            {otp.status === "verified" ? (
              <p className="flex items-center gap-1.5 text-sm text-emerald-600 dark:text-emerald-400">
                <Check className="w-4 h-4" />
                {t("emailVerified")}
              </p>
            ) : (
              <div className="flex flex-col gap-3">
                {otp.status === "sent" && (
                  <>
                    <p className="text-sm text-slate-500 dark:text-slate-400">{t("codeSentHint", { email: emailTrimmed })}</p>
                    <div className="flex items-end gap-2">
                      <div className="flex-1">
                        <Field
                          label={t("codeLabel")}
                          value={code}
                          onChange={(value) => setCode(value.replace(/\D/g, "").slice(0, 6))}
                          autoComplete="one-time-code"
                          required
                        />
                      </div>
                      <button
                        type="button"
                        onClick={handleVerifyCode}
                        disabled={busy || code.length !== 6}
                        className="flex items-center justify-center gap-2 py-2.5 px-4 cursor-pointer bg-blue-600 text-white text-sm font-medium rounded-md shadow-sm hover:bg-blue-700 transition-colors disabled:opacity-50"
                      >
                        {otp.pending && <Loader2 className="w-4 h-4 animate-spin" />}
                        {t("verify")}
                      </button>
                    </div>
                  </>
                )}

                <button
                  type="button"
                  onClick={handleSendCode}
                  disabled={busy || !emailTrimmed || emailAvailability === "taken" || otp.cooldown > 0}
                  className={secondaryButton}
                >
                  {otp.pending && otp.status === "idle" && <Loader2 className="w-4 h-4 animate-spin" />}
                  {otp.cooldown > 0
                    ? t("resendIn", { seconds: otp.cooldown })
                    : otp.status === "sent"
                      ? t("resendCode")
                      : t("sendCode")}
                </button>
              </div>
            )}

            <PhoneField value={localPhone} onChange={handlePhoneChange} error={phoneInvalid} />

            <Field label={t("addressLabel")} value={address} onChange={setAddress} autoComplete="street-address" required />

            <label className="flex flex-col gap-1 text-sm font-medium text-slate-700 dark:text-slate-300">
              {t("genderLabel")}
              <select value={gender} onChange={(e) => setGender(e.target.value as Gender)} className={selectClass}>
                <option value="MALE">{t("male")}</option>
                <option value="FEMALE">{t("female")}</option>
              </select>
            </label>

            <div>
              <Field label={t("passwordLabel")} type="password" value={password} onChange={setPassword} autoComplete="new-password" required />
              <PasswordRequirements password={password} />
            </div>
            <Field
              label={t("confirmPasswordLabel")}
              type="password"
              value={confirmPassword}
              onChange={setConfirmPassword}
              autoComplete="new-password"
              required
            />

            <label className="flex items-start gap-2 text-sm cursor-pointer text-slate-600 dark:text-slate-300">
              <input
                ref={termsRef}
                type="checkbox"
                checked={agreedToTerms}
                onChange={(e) => setAgreedToTerms(e.target.checked)}
                required
                className="mt-0.5 rounded cursor-pointer border-slate-300 dark:border-slate-700 text-blue-600 focus:ring-blue-500"
              />
              <span>
                {t.rich("agreeToTerms", {
                  terms: (chunks) => <Link href="/terms" target="_blank" className="text-blue-600 dark:text-blue-400 hover:underline">{chunks}</Link>,
                  privacy: (chunks) => <Link href="/privacy" target="_blank" className="text-blue-600 dark:text-blue-400 hover:underline">{chunks}</Link>,
                })}
              </span>
            </label>

            {error && <p className="text-sm text-red-600 dark:text-red-400">{error}</p>}

            <button
              type="submit"
              disabled={
                busy ||
                !agreedToTerms ||
                otp.status !== "verified" ||
                !firstName ||
                !lastName ||
                !localPhone ||
                !address ||
                !password ||
                !confirmPassword
              }
              className="mt-1 flex items-center justify-center gap-2 py-2.5 cursor-pointer bg-blue-600 text-white text-sm font-medium rounded-md shadow-sm hover:bg-blue-700 transition-colors disabled:opacity-50"
            >
              {loading && <Loader2 className="w-4 h-4 animate-spin" />}
              {loading ? t("creatingAccount") : t("createAccount")}
            </button>
          </form>
        </div>

        <p className="text-sm text-slate-500 dark:text-slate-400 text-center mt-6">
          {t("alreadyHaveAccount")}{" "}
          <Link href="/login" className="text-blue-600 dark:text-blue-400 hover:underline">
            {t("signIn")}
          </Link>
        </p>
      </div>
    </main>
  );
}