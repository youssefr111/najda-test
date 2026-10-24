"use client";

import { useTranslations } from "next-intl";
import useTitle from "@/hooks/useTitle";
import AuthGuard from "@/components/Auth/AuthGuard";
import RoleProtectedRoute from "@/components/Auth/RoleProtectedRoute";
import ManagerDashboard from "@/components/Manager/ManagerDashboard";
import { MANAGER_ROLES } from "@/lib/auth/roles";

function ManagerContent() {
  const t = useTranslations("manager");
  useTitle(`${t("title")} - NAJDA`);

  return (
    <main className="flex grow w-full min-h-screen flex-col bg-slate-50 dark:bg-slate-950 transition-colors">
      <ManagerDashboard />
    </main>
  );
}

export default function ManagerPage() {
  return (
    <AuthGuard>
      <RoleProtectedRoute allowedRoles={MANAGER_ROLES}>
        <ManagerContent />
      </RoleProtectedRoute>
    </AuthGuard>
  );
}
