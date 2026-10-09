"use client";

import { ReactNode } from "react";
import useAuth from "@/hooks/auth/useAuth";

export default function DisabledGate({ children }: { children: ReactNode }) {
  const { user, status, isProfileLoading, isProfileError } = useAuth();

  // Don't gate while auth/profile state is still unknown.
  if (status !== "authenticated" || isProfileLoading || isProfileError || !user) {
    return <>{children}</>;
  }

  console.log("user.enabled", user.enabled);

  if (!user.enabled) {
    return (
        <main className="min-h-screen flex items-center justify-center px-6">
            <div className="w-full max-w-md text-center space-y-4">
                <h1 className="text-2xl font-semibold">
                Account disabled
                </h1>

                <p className="text-sm text-slate-600 dark:text-slate-300">
                Your account has been disabled. Please contact an administrator
                if you believe this is a mistake.
                </p>
            </div>
        </main>
    );
  }

  return <>{children}</>;
}