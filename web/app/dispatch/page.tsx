"use client";

import useAuth from "@/hooks/auth/useAuth";
import useTitle from "@/hooks/useTitle";
import DispatchFeed from "@/components/Dispatch/DispatchFeed";
import Loading from "@/components/ui/Loading";
import AuthGuard from "@/components/Auth/AuthGuard";
import RoleProtectedRoute from "@/components/Auth/RoleProtectedRoute";
import { DISPATCH_ROLES } from "@/lib/auth/roles";

function DispatchContent() {
  const { user } = useAuth();
  useTitle("Dispatch - NAJDA");

  if (!user) return <Loading />;

  return (
    <main className="flex flex-col grow w-full min-h-screen bg-white dark:bg-slate-950 transition-colors">
      <DispatchFeed user={user} />
    </main>
  );
}

export default function Dispatch() {
  return (
    <AuthGuard>
      <RoleProtectedRoute allowedRoles={DISPATCH_ROLES}>
        <DispatchContent />
      </RoleProtectedRoute>
    </AuthGuard>
  );
}