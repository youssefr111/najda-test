"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { isSignInWithEmailLink, signInWithEmailLink } from "firebase/auth";
import { Loader2 } from "lucide-react";
import { firebaseAuth } from "@/lib/firebase/client";
import { resolveAuthError } from "@/lib/auth/errors";
import { registerCitizenBootstrap } from "@/lib/auth/registerCitizenBootstrap";
import { establishSession } from "@/lib/auth/establishSession";
import LogoStacked from "@/components/ui/LogoStacked";
import { ApiError } from "@/lib/api/client";

const EMAIL_FOR_SIGNIN_KEY = "najda-email-for-signin";

type Stage = "verifying" | "need-email" | "error";

export default function CompleteSignupPage() {
  const t = useTranslations("auth.completeSignup");
  const tErrors = useTranslations("auth.errors");
  const router = useRouter();
  const [stage, setStage] = useState<Stage>("verifying");
  const [emailInput, setEmailInput] = useState("");
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!isSignInWithEmailLink(firebaseAuth, window.location.href)) {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setError(t("invalidLink"));
      setStage("error");
      return;
    }

    const savedEmail = window.localStorage.getItem(EMAIL_FOR_SIGNIN_KEY);
    if (savedEmail) {
      completeSignIn(savedEmail);
    } else {
      setStage("need-email");
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function completeSignIn(email: string) {
    setStage("verifying");
    try {
      const credential = await signInWithEmailLink(firebaseAuth, email, window.location.href);
      window.localStorage.removeItem(EMAIL_FOR_SIGNIN_KEY);

    try {
      await registerCitizenBootstrap({
        firstName: "",
        lastName: "",
        email: credential.user.email ?? email,
        provider: "email_link",
      });
      } catch (err) {
      if (!(err instanceof ApiError) || err.status !== 409) {
        throw err;
      }
    }
      await establishSession(tErrors("sessionFailed"));

      router.push("/");
    } catch (err) {
      setError(resolveAuthError(err, tErrors));
      setStage("error");
    }
  }

  if (stage === "verifying") {
    return (
      <main className="min-h-screen flex items-center justify-center bg-slate-50 dark:bg-slate-950 px-4">
        <div className="flex flex-col items-center gap-3 text-slate-500 dark:text-slate-400">
          <Loader2 className="w-6 h-6 animate-spin" />
          <p className="text-sm">{t("confirming")}</p>
        </div>
      </main>
    );
  }

  if (stage === "need-email") {
    return (
      <main className="min-h-screen flex items-center justify-center bg-slate-50 dark:bg-slate-950 px-4 py-12">
        <div className="w-full max-w-md">
          <div className="flex flex-col items-center text-center mb-8">
            <LogoStacked width={56} height={56} className="mb-2" />
          </div>
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-6 shadow-sm flex flex-col gap-4">
            <p className="text-sm text-slate-600 dark:text-slate-300">{t("confirmEmailPrompt")}</p>
            <input
              type="email"
              value={emailInput}
              onChange={(e) => setEmailInput(e.target.value)}
              placeholder={t("emailPlaceholder")}
              dir="ltr"
              className="px-3 py-2 bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 text-slate-900 dark:text-slate-100 rounded-md text-sm text-start"
            />
            <button
              type="button"
              onClick={() => emailInput && completeSignIn(emailInput)}
              disabled={!emailInput}
              className="py-2.5 bg-blue-600 text-white text-sm font-medium rounded-md disabled:opacity-50"
            >
              {t("continue")}
            </button>
          </div>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen flex items-center justify-center bg-slate-50 dark:bg-slate-950 px-4 py-12">
      <div className="w-full max-w-md text-center">
        <div className="bg-white dark:bg-slate-900 border border-red-200 dark:border-red-900 rounded-xl p-6 shadow-sm">
          <p className="text-sm text-red-600 dark:text-red-400">{error}</p>
        </div>
      </div>
    </main>
  );
}