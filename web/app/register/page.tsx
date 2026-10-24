"use client";

import useAuth from "@/hooks/auth/useAuth";
import AuthGuard from "@/components/Auth/AuthGuard";
import { getRoleHome } from "@/lib/auth/roles";
import RegisterForm from "@/components/Auth/RegisterForm";

export default function RegisterPage() {
  const { user } = useAuth();

  return (
    <AuthGuard redirectIfAuthenticated redirectPath={getRoleHome(user?.roleName)}>
      <RegisterForm />
    </AuthGuard>
  );
}