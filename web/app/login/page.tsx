"use client";

import useAuth from "@/hooks/auth/useAuth";
import AuthGuard from "@/components/Auth/AuthGuard";
import LoginForm from "@/components/Auth/LoginForm";
import { getRoleHome } from "@/lib/auth/roles";

export default function LoginPage() {
  const { user } = useAuth();

  return (
    <AuthGuard redirectIfAuthenticated redirectPath={getRoleHome(user?.roleName)}>
      <LoginForm />
    </AuthGuard>
  );
}