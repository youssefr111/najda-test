"use client";

import { FC, ReactNode, useEffect } from "react";
import { useRouter } from "next/navigation";
import useAuth from "@/hooks/auth/useAuth";

interface AuthGuardProps {
  children: ReactNode;
  redirectIfAuthenticated?: boolean;
  redirectPath?: string;
}

/**
 * Gates on Firebase auth state only. A backend outage should degrade the
 * page (show "couldn't load your profile"), not log someone out and bounce
 * them to /login as if their session were invalid — those are different
 * failures and deserve different handling.
 */
const AuthGuard: FC<AuthGuardProps> = ({
  children,
  redirectIfAuthenticated = false,
  redirectPath = "/",
}) => {
  const { status } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (status === "loading") return;
    if (redirectIfAuthenticated && status === "authenticated") {
      router.replace(redirectPath);
    }
    if (!redirectIfAuthenticated && status === "unauthenticated") {
      router.replace("/login");
    }
  }, [status, redirectIfAuthenticated, redirectPath, router]);

  if (status === "loading") return null;
  if (redirectIfAuthenticated && status === "authenticated") return null;
  if (!redirectIfAuthenticated && status === "unauthenticated") return null;

  return <>{children}</>;
};

export default AuthGuard;