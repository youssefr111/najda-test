"use client";

import { useCallback, useEffect, useState } from "react";
import { sendEmailOtp, verifyEmailOtp } from "@/lib/auth/emailOtp";

export type EmailOtpStatus = "idle" | "sent" | "verified";

/**
 * Owns the OTP lifecycle for one email address: idle -> sent -> verified.
 * Errors are rethrown so the calling form decides how to present them.
 */
export function useEmailOtp() {
  const [status, setStatus] = useState<EmailOtpStatus>("idle");
  const [verificationToken, setVerificationToken] = useState<string | null>(null);
  const [cooldown, setCooldown] = useState(0);
  const [pending, setPending] = useState(false);

  useEffect(() => {
    if (cooldown <= 0) return;
    const id = setTimeout(() => setCooldown((seconds) => seconds - 1), 1000);
    return () => clearTimeout(id);
  }, [cooldown]);

  /** Call whenever the email changes: a verification only ever applies to one address. */
  const reset = useCallback(() => {
    setStatus("idle");
    setVerificationToken(null);
    setCooldown(0);
  }, []);

  const send = useCallback(async (email: string) => {
    setPending(true);
    try {
      const { resendAfterSeconds } = await sendEmailOtp(email);
      setStatus("sent");
      setCooldown(resendAfterSeconds);
    } finally {
      setPending(false);
    }
  }, []);

  const verify = useCallback(async (email: string, code: string) => {
    setPending(true);
    try {
      const result = await verifyEmailOtp(email, code);
      setVerificationToken(result.verificationToken);
      setStatus("verified");
    } finally {
      setPending(false);
    }
  }, []);

  return { status, verificationToken, cooldown, pending, send, verify, reset };
}