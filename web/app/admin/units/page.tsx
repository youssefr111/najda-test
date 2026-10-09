"use client";

import useAuth from "@/hooks/auth/useAuth";
import Loading from "@/components/ui/Loading";
import UnitsFeed from "@/components/Admin/UnitsFeed";

export default function AdminUnitsPage() {
  const { user } = useAuth();
  if (!user) return <Loading />;
  return <UnitsFeed />;
}