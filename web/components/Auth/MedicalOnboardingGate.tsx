"use client";

import type { ReactNode } from "react";
import useAuth from "@/hooks/auth/useAuth";
import { useAuthStore } from "@/store/auth-store";
import Loading from "@/components/ui/Loading";
import MedicalOnboarding from "./MedicalOnboarding";

/**
 * Shows the optional medical-profile step once, right after a citizen registers.
 * It never blocks anything: Skip is always available and the same form lives on
 * the account page. Sits inside ProfileGate, so a Google sign-up finishes the
 * required profile first and only then sees this step.
 */
export default function MedicalOnboardingGate({ children }: { children: ReactNode }) {
  const pending = useAuthStore((s) => s.medicalOnboardingPending);
  const setPending = useAuthStore((s) => s.setMedicalOnboardingPending);
  const { user, status } = useAuth();

  if (!pending || status === "unauthenticated") return <>{children}</>;
  if (status === "loading" || !user) return <Loading />;

  return <MedicalOnboarding onFinish={() => setPending(false)} />;
}