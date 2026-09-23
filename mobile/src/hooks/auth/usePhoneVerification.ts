import { useState } from "react";
import {
  linkWithPhoneNumber,
  updatePhoneNumber,
  PhoneAuthProvider,
  type ApplicationVerifier,
  type ConfirmationResult,
} from "firebase/auth";
import { firebaseAuth } from "@/firebase/client";

/**
 * A real RecaptchaVerifier can't be constructed here -- it needs a DOM
 * element. This satisfies the ApplicationVerifier interface structurally
 * without being a real verifier: with
 * `appVerificationDisabledForTesting = true` (see firebase/client.ts) set,
 * Firebase's backend skips actually invoking/validating this for phone
 * numbers registered as test numbers, which is the only case this is
 * expected to work for. For a real number, Firebase will reject the
 * request since there's no genuine reCAPTCHA assertion behind it -- that
 * part sends real SMS and would need a real verifier (see the note in
 * usePhoneVerification below for what that requires).
 */
const dummyVerifier: ApplicationVerifier = {
  type: "recaptcha",
  verify: async () => "",
};

type Stage = "idle" | "code-sent";

/**
 * Test-number-only phone verification (see firebase/client.ts's
 * appVerificationDisabledForTesting comment for exactly why). This is
 * NOT a path to real-number SMS verification -- that needs either
 * @react-native-firebase/auth (a native module, incompatible with Expo Go)
 * or a custom WebView-hosted reCAPTCHA bridge, neither of which is what
 * this implements. Untested against a live Firebase project from this
 * environment -- verify against your actual test numbers before relying
 * on it.
 */
export function usePhoneVerification() {
  const [stage, setStage] = useState<Stage>("idle");
  const [confirmationResult, setConfirmationResult] = useState<ConfirmationResult | null>(null);
  const [verificationId, setVerificationId] = useState<string | null>(null);
  const [sending, setSending] = useState(false);
  const [confirming, setConfirming] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function sendCode(phoneNumber: string) {
    setError(null);
    setSending(true);
    try {
      const currentUser = firebaseAuth.currentUser;
      if (!currentUser) throw new Error("Not signed in");

      if (currentUser.phoneNumber) {
        // Already has a phone linked -- this is a change, not a first link.
        const provider = new PhoneAuthProvider(firebaseAuth);
        const id = await provider.verifyPhoneNumber(phoneNumber, dummyVerifier);
        setVerificationId(id);
      } else {
        const result = await linkWithPhoneNumber(currentUser, phoneNumber, dummyVerifier);
        setConfirmationResult(result);
      }
      setStage("code-sent");
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setSending(false);
    }
  }

  async function confirmCode(code: string): Promise<boolean> {
    setError(null);
    setConfirming(true);
    try {
      const currentUser = firebaseAuth.currentUser;
      if (!currentUser) throw new Error("Not signed in");

      if (confirmationResult) {
        await confirmationResult.confirm(code);
      } else if (verificationId) {
        await updatePhoneNumber(currentUser, PhoneAuthProvider.credential(verificationId, code));
      } else {
        throw new Error("No verification in progress");
      }

      await currentUser.getIdToken(true);
      reset();
      return true;
    } catch {
      setError("codeError");
      return false;
    } finally {
      setConfirming(false);
    }
  }

  function reset() {
    setStage("idle");
    setConfirmationResult(null);
    setVerificationId(null);
    setError(null);
  }

  return { stage, sendCode, confirmCode, reset, sending, confirming, error };
}
