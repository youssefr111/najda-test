"use client";

import useAuth from "@/hooks/auth/useAuth";
import useTitle from "@/hooks/useTitle";
import EmergencyFeed from "@/components/Emergency/EmergencyFeed";
import Loading from "@/components/ui/Loading";
import AuthGuard from "@/components/Auth/AuthGuard";

function EmergencyContent() {
  const { user } = useAuth();
  useTitle("Emergency - NAJDA");

  if (!user) return <Loading />;

  return (
    <main className="flex flex-col grow w-full min-h-screen bg-white dark:bg-slate-950 transition-colors">
      <EmergencyFeed user={user} />
    </main>
  );
}

export default function Emergency() {
  return (
    <AuthGuard>
      <EmergencyContent />
    </AuthGuard>
  );
}