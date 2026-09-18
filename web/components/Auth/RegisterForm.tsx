"use client";

import { useState, type FormEvent } from "react";
import Link from "next/link";
import { useTranslations } from "next-intl";
import { sendSignInLinkToEmail, signInWithPopup, GoogleAuthProvider } from "firebase/auth";
import { useRouter } from "next/navigation";
import { Loader2, Mail } from "lucide-react";
import { resolveAuthError } from "@/lib/auth/errors";
import { firebaseAuth } from "@/lib/firebase/client";
import { registerCitizenBootstrap } from "@/lib/auth/registerCitizenBootstrap";
import { establishSession } from "@/lib/auth/establishSession";
import Field from "./Field";
import GoogleIcon from "./GoogleIcon";
import LogoStacked from "../ui/LogoStacked";

const EMAIL_FOR_SIGNIN_KEY = "najda-email-for-signin";

function splitDisplayName(displayName: string | null): { firstName: string; lastName: string } {
  if (!displayName) return { firstName: "", lastName: "" };
  const [firstName, ...rest] = displayName.trim().split(/\s+/);
  return { firstName: firstName ?? "", lastName: rest.join(" ") };
}

export default function RegisterForm() {
  const t = useTranslations("auth.register");
  const tErrors = useTranslations("auth.errors");
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [agreedToTerms, setAgreedToTerms] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [linkSent, setLinkSent] = useState(false);

  async function handleSendLink(e: FormEvent) {
    e.preventDefault();
    setError(null);

    if (!agreedToTerms) {
      setError(t("agreeRequired"));
      return;
    }

    setLoading(true);
    try {
      const actionCodeSettings = {
        url: `${window.location.origin}/complete-signup`,
        handleCodeInApp: true,
      };
      await sendSignInLinkToEmail(firebaseAuth, email, actionCodeSettings);
      window.localStorage.setItem(EMAIL_FOR_SIGNIN_KEY, email);
      setLinkSent(true);
    } catch (err) {
      setError(resolveAuthError(err, tErrors));
    } finally {
      setLoading(false);
    }
  }

  async function handleGoogleSignIn() {
    if (!agreedToTerms) {
      setError(t("agreeRequired"));
      return;
    }
    setError(null);
    setLoading(true);
    let registeredWithBackend = false;
    try {
      const provider = new GoogleAuthProvider();
      const credential = await signInWithPopup(firebaseAuth, provider);
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
      if (!registeredWithBackend) {
        await firebaseAuth.currentUser?.delete().catch(() => null);
      }
      setError(resolveAuthError(err, tErrors));
    } finally {
      setLoading(false);
    }
  }

  if (linkSent) {
    return (
      <main className="min-h-screen flex items-center justify-center bg-slate-50 dark:bg-slate-950 px-4 py-12 transition-colors">
        <div className="w-full max-w-md text-center">
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-8 shadow-sm flex flex-col items-center gap-3">
            <Mail className="w-10 h-10 text-blue-600 dark:text-blue-400" />
            <h2 className="text-lg font-semibold text-slate-900 dark:text-slate-100">{t("checkEmailTitle")}</h2>
            <p className="text-sm text-slate-500 dark:text-slate-400">
              {t.rich("checkEmailBody", { email, strong: (chunks) => <strong className="text-slate-700 dark:text-slate-300">{chunks}</strong> })}
            </p>
          </div>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen flex items-center justify-center bg-slate-50 dark:bg-slate-950 px-4 py-12 transition-colors">
      <div className="w-full max-w-md">
        <div className="flex flex-col items-center text-center mb-8">
          <LogoStacked width={56} height={56} className="mb-2" />
          <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">{t("subtitle")}</p>
        </div>

        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-6 shadow-sm">
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

          <form onSubmit={handleSendLink} className="flex flex-col gap-4">
            <Field label={t("emailLabel")} type="email" value={email} onChange={setEmail} autoComplete="email" required />

            <label className="flex items-start gap-2 text-sm text-slate-600 dark:text-slate-300">
              <input
                type="checkbox"
                checked={agreedToTerms}
                onChange={(e) => setAgreedToTerms(e.target.checked)}
                required
                className="mt-0.5 rounded border-slate-300 dark:border-slate-700 text-blue-600 focus:ring-blue-500"
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
              disabled={loading || !agreedToTerms || !email}
              className="mt-1 flex items-center justify-center gap-2 py-2.5 bg-blue-600 text-white text-sm font-medium rounded-md shadow-sm hover:bg-blue-700 transition-colors disabled:opacity-50"
            >
              {loading && <Loader2 className="w-4 h-4 animate-spin" />}
              {loading ? t("sendingLink") : t("continueWithEmail")}
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