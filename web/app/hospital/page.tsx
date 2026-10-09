"use client";

import { useTranslations } from "next-intl";
import useAuth from "@/hooks/auth/useAuth";
import useTitle from "@/hooks/useTitle";
import HospitalFeed from "@/components/Hospital/HospitalFeed";
import Loading from "@/components/ui/Loading";
import AuthGuard from "@/components/Auth/AuthGuard";
import RoleProtectedRoute from "@/components/Auth/RoleProtectedRoute";
import { HOSPITAL_ROLES } from "@/lib/auth/roles";

function HospitalContent() {
  const { user } = useAuth();
  const t = useTranslations("hospitalPage");
  useTitle(t("title"));

  if (!user) return <Loading />;

  if (!user.facilityId) {
    return (
      <main className="min-h-screen flex items-center justify-center bg-white dark:bg-slate-950 transition-colors px-4">
        <p className="text-sm text-slate-500 dark:text-slate-400 text-center">{t("notLinked")}</p>
      </main>
    );
  }

  return (
    <main className="flex flex-col grow w-full min-h-screen bg-white dark:bg-slate-950 transition-colors">
      <HospitalFeed hospitalId={user.facilityId} hospitalName={user.facilityName} />
    </main>
  );
}

export default function HospitalPage() {
  return (
    <AuthGuard>
      <RoleProtectedRoute allowedRoles={HOSPITAL_ROLES}>
        <HospitalContent />
      </RoleProtectedRoute>
    </AuthGuard>
  );
}