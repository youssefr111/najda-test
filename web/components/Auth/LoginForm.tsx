"use client";

import { useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import Link from "next/link";
import {
  signInWithEmailAndPassword,
  signInWithPopup,
  GoogleAuthProvider,
  getMultiFactorResolver,
  PhoneAuthProvider,
  PhoneMultiFactorGenerator,
  sendPasswordResetEmail,
  signOut,
  type MultiFactorResolver,
  type UserCredential,
} from "firebase/auth";
import { Loader2 } from "lucide-react";
import { firebaseAuth } from "@/lib/firebase/client";
import { resolveAuthError } from "@/lib/auth/errors";
import { getRoleHome } from "@/lib/auth/roles";
import Field from "./Field";
import GoogleIcon from "./GoogleIcon";
import LogoStacked from "../ui/LogoStacked";
import { useRecaptchaVerifier } from "@/hooks/auth/useRecaptchaVerifier";

type Mode = "sign-in" | "mfa" | "forgot-password";

export default function LoginForm() {
  const t = useTranslations("auth.login");
  const tErrors = useTranslations("auth.errors");
  const router = useRouter();
  const [mode, setMode] = useState<Mode>("sign-in");

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const [mfaResolver, setMfaResolver] = useState<MultiFactorResolver | null>(null);
  const [mfaVerificationId, setMfaVerificationId] = useState<string | null>(null);
  const [mfaCode, setMfaCode] = useState("");

  const [resetSent, setResetSent] = useState(false);

  const { getVerifier } = useRecaptchaVerifier("recaptcha-container");

  async function establishSession(credential: UserCredential) {
    const idToken = await credential.user.getIdToken();
    const res = await fetch("/api/session", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ idToken }),
    });

    if (!res.ok) {
      const body = await res.json().catch(() => null);
      throw new Error(body?.error ?? tErrors("sessionFailed"));
    }

    const { role } = (await res.json()) as { role: string };
    router.push(getRoleHome(role) ?? "/");
  }

  async function handlePasswordSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      const credential = await signInWithEmailAndPassword(firebaseAuth, email, password);
      await establishSession(credential);
    } catch (err) {
        if ((err as { code?: string }).code === "auth/multi-factor-auth-required") {
          await startMfaChallenge(err);
        } else {
          await signOut(firebaseAuth).catch(() => null);
          setError(resolveAuthError(err, tErrors));
        }
    } finally {
        setLoading(false);
    }
  }

  async function handleGoogleSignIn() {
    setError(null);
    setLoading(true);
    try {
      const provider = new GoogleAuthProvider();
      const credential = await signInWithPopup(firebaseAuth, provider);
      await establishSession(credential);
    } catch (err) {
      const code = (err as { code?: string }).code;
      if (code === "auth/multi-factor-auth-required") {
        await startMfaChallenge(err);
      } else {
        const message = resolveAuthError(err, tErrors);
        if (message) setError(message);
      }
    } finally {
      setLoading(false);
    }
  }

  async function startMfaChallenge(err: unknown) {
    const resolver = getMultiFactorResolver(firebaseAuth, err as import("firebase/auth").MultiFactorError);
    setMfaResolver(resolver);

    const phoneAuthProvider = new PhoneAuthProvider(firebaseAuth);
    const verificationId = await phoneAuthProvider.verifyPhoneNumber(
      { multiFactorHint: resolver.hints[0], session: resolver.session },
      getVerifier()
    );
    setMfaVerificationId(verificationId);
  }

  async function handleMfaSubmit(e: FormEvent) {
    e.preventDefault();
    if (!mfaResolver || !mfaVerificationId) return;
    setError(null);
    setLoading(true);
    try {
      const phoneCredential = PhoneAuthProvider.credential(mfaVerificationId, mfaCode);
      const assertion = PhoneMultiFactorGenerator.assertion(phoneCredential);
      const credential = await mfaResolver.resolveSignIn(assertion);
      await establishSession(credential);
    } catch {
      setError(t("mfaCodeInvalid"));
    } finally {
      setLoading(false);
    }
  }

  async function handleForgotPassword(e: FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      await sendPasswordResetEmail(firebaseAuth, email);
      setResetSent(true);
    } catch (err) {
      setError(resolveAuthError(err, tErrors));
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="min-h-screen flex items-center justify-center bg-slate-50 dark:bg-slate-950 px-4 py-12 transition-colors">
      <div id="recaptcha-container" />

      <div className="w-full max-w-sm">
        <div className="flex flex-col justify-center items-center text-center mb-8">
          <LogoStacked width={56} height={56} className="mb-2" />
          <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
            {mode === "forgot-password" ? t("resetSubtitle") : t("signInSubtitle")}
          </p>
        </div>

        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-6 shadow-sm">
          {mode === "sign-in" && (
            <>
              <button
                type="button"
                onClick={handleGoogleSignIn}
                disabled={loading}
                className="w-full flex items-center justify-center gap-2 py-2.5 border border-slate-300 dark:border-slate-700 rounded-md text-sm font-medium text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors disabled:opacity-50"
              >
                <GoogleIcon />
                {t("continueWithGoogle")}
              </button>

              <div className="flex items-center gap-3 my-5">
                <div className="h-px flex-1 bg-slate-200 dark:bg-slate-800" />
                <span className="text-xs text-slate-400 dark:text-slate-500 uppercase tracking-wide">{t("or")}</span>
                <div className="h-px flex-1 bg-slate-200 dark:bg-slate-800" />
              </div>

              <form onSubmit={handlePasswordSubmit} className="flex flex-col gap-4">
                <Field label={t("emailLabel")} type="email" value={email} onChange={setEmail} autoComplete="email" required />
                <div>
                  <Field label={t("passwordLabel")} type="password" value={password} onChange={setPassword} autoComplete="current-password" required />
                  <button
                    type="button"
                    onClick={() => {
                      setError(null);
                      setResetSent(false);
                      setMode("forgot-password");
                    }}
                    className="mt-1.5 text-xs text-blue-600 dark:text-blue-400 hover:underline"
                  >
                    {t("forgotPassword")}
                  </button>
                </div>

                {error && <p className="text-sm text-red-600 dark:text-red-400">{error}</p>}

                <button
                  type="submit"
                  disabled={loading}
                  className="mt-1 flex items-center justify-center gap-2 py-2.5 cursor-pointer bg-blue-600 text-white text-sm font-medium rounded-md shadow-sm hover:bg-blue-700 active:bg-blue-800 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-2 dark:focus-visible:ring-offset-slate-900 transition-colors disabled:opacity-50"
                >
                  {loading && <Loader2 className="w-4 h-4 animate-spin" />}
                  {loading ? t("signingIn") : t("signIn")}
                </button>
              </form>
            </>
          )}

          {mode === "mfa" && (
            <form onSubmit={handleMfaSubmit} className="flex flex-col gap-4">
              <p className="text-sm text-slate-600 dark:text-slate-300">{t("mfaPrompt")}</p>
              <Field label={t("verificationCode")} type="text" value={mfaCode} onChange={setMfaCode} autoComplete="one-time-code" required />
              {error && <p className="text-sm text-red-600 dark:text-red-400">{error}</p>}
              <button
                type="submit"
                disabled={loading}
                className="flex items-center justify-center gap-2 py-2.5 bg-blue-600 text-white text-sm font-medium rounded-md shadow-sm hover:bg-blue-700 transition-colors disabled:opacity-50"
              >
                {loading && <Loader2 className="w-4 h-4 animate-spin" />}
                {loading ? t("verifying") : t("verify")}
              </button>
            </form>
          )}

          {mode === "forgot-password" && (
            <>
              {resetSent ? (
                <p className="text-sm text-slate-600 dark:text-slate-300">
                  {t("resetSentBefore")} <span className="font-medium">{email}</span> {t("resetSentAfter")}
                </p>
              ) : (
                <form onSubmit={handleForgotPassword} className="flex flex-col gap-4">
                  <Field label={t("emailLabel")} type="email" value={email} onChange={setEmail} autoComplete="email" required />
                  {error && <p className="text-sm text-red-600 dark:text-red-400">{error}</p>}
                  <button
                    type="submit"
                    disabled={loading}
                    className="flex items-center justify-center gap-2 py-2.5 bg-blue-600 text-white text-sm font-medium rounded-md shadow-sm hover:bg-blue-700 transition-colors disabled:opacity-50"
                  >
                    {loading && <Loader2 className="w-4 h-4 animate-spin" />}
                    {loading ? t("sending") : t("sendResetLink")}
                  </button>
                </form>
              )}

              <button
                type="button"
                onClick={() => {
                  setError(null);
                  setResetSent(false);
                  setMode("sign-in");
                }}
                className="mt-4 text-sm text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 transition-colors"
              >
                {t("backToSignIn")}
              </button>
            </>
          )}
        </div>

        {mode === "sign-in" && (
          <p className="text-sm text-slate-500 dark:text-slate-400 text-center mt-6">
            {t("newCitizen")}{" "}
            <Link href="/register" className="text-blue-600 dark:text-blue-400 hover:underline">
              {t("createAccount")}
            </Link>
          </p>
        )}
      </div>
    </main>
  );
}