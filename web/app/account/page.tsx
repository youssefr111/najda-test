"use client";

import useAuth from "@/hooks/auth/useAuth";
import useTitle from "@/hooks/useTitle";
import AccountFeed from "@/components/Account/AccountFeed";
import Loading from "@/components/ui/Loading";
import AuthGuard from "@/components/Auth/AuthGuard";

function AccountContent() {
  const { user } = useAuth();
  useTitle(user?.firstName ? `@${user.firstName} - NAJDA` : "Account - NAJDA");

  if (!user) return <Loading />;

  return (
    <main className="flex flex-col grow w-full min-h-screen bg-white dark:bg-slate-950 transition-colors">
      <AccountFeed user={user} />
    </main>
  );
}

export default function Account() {
  return (
    <AuthGuard>
      <AccountContent />
    </AuthGuard>
  );
}