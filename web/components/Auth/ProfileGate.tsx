"use client";

import { ReactNode } from "react";
import useAuth from "@/hooks/auth/useAuth";
import CompleteProfileForm from "./CompleteProfileForm";

export default function ProfileGate({ children }: { children: ReactNode }) {
  const { user, status, isProfileLoading, isProfileError } = useAuth();

  // Nothing to gate if we don't yet know who's signed in, or nobody is.
  // Same reasoning as before: don't punish a backend hiccup by pretending
  // completion is required when it's actually just unknown right now.
  if (status !== "authenticated" || isProfileLoading || isProfileError || !user) {
    return <>{children}</>;
  }

  if (!user.profileCompleted) {
    return <CompleteProfileForm user={user} />;
  }

  return <>{children}</>;
}