"use client";

import useAuth from "@/hooks/auth/useAuth";
import useTitle from "@/hooks/useTitle";
import ResponderFeed from "@/components/Responder/ResponderFeed";
import Loading from "@/components/ui/Loading";
import AuthGuard from "@/components/Auth/AuthGuard";
import RoleProtectedRoute from "@/components/Auth/RoleProtectedRoute";
import { RESPONDER_ROLES } from "@/lib/auth/roles";

function ResponderContent() {
  const { user } = useAuth();
  useTitle("On Duty - NAJDA");
  if (!user) return <Loading />;
  return (
    <main className="min-h-screen bg-slate-50 dark:bg-slate-950 transition-colors">
      <ResponderFeed user={user} />
    </main>
  );
}

export default function ResponderPage() {
  return (
    <AuthGuard>
      <RoleProtectedRoute allowedRoles={RESPONDER_ROLES}>
        <ResponderContent />
      </RoleProtectedRoute>
    </AuthGuard>
  );
}