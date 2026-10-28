"use client";

import useAuth from "@/hooks/auth/useAuth";
import useTitle from "@/hooks/useTitle";
import AdminFeed from "@/components/Admin/AdminFeed";
import Loading from "@/components/ui/Loading";

export default function AdminUsersPage() {
  const { user } = useAuth();
  useTitle(user?.firstName ? `@${user.firstName} - NAJDA Admin` : "Admin - NAJDA");

  if (!user) return <Loading />;
  return <AdminFeed />;
}