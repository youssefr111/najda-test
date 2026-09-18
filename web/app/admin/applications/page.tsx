"use client";

import useAuth from "@/hooks/auth/useAuth";
import Loading from "@/components/ui/Loading";
import ApplicationsFeed from "@/components/Admin/ApplicationsFeed";

export default function AdminApplicationsPage() {
  const { user } = useAuth();
  if (!user) return <Loading />;
  return <ApplicationsFeed />;
}