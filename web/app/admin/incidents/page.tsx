"use client";

import useAuth from "@/hooks/auth/useAuth";
import Loading from "@/components/ui/Loading";
import AllIncidentsFeed from "@/components/Admin/AllIncidentsFeed";

export default function AdminIncidentsPage() {
  const { user } = useAuth();
  if (!user) return <Loading />;
  return <AllIncidentsFeed />;
}