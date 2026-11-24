"use client";

import useTitle from "@/hooks/useTitle";
import AuthGuard from "@/components/Auth/AuthGuard";
import KycReturn from "@/components/Kyc/KycReturn";

export default function KycReturnPage() {
  useTitle("Identity verification - NAJDA");
  return (
    <AuthGuard>
      <main className="flex min-h-screen grow flex-col bg-white dark:bg-slate-950">
        <KycReturn />
      </main>
    </AuthGuard>
  );
}
