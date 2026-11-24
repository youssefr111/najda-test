"use client";

import useAuth from "@/hooks/auth/useAuth";
import Loading from "@/components/ui/Loading";
import FacilitiesTable from "@/components/Admin/FacilitiesTable";

export default function AdminFacilitiesPage() {
  const { user } = useAuth();
  if (!user) return <Loading />;
  return <FacilitiesTable />;
}