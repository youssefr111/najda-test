"use client";

import useAuth from "@/hooks/auth/useAuth";
import Loading from "@/components/ui/Loading";
import GuidanceEditor from "@/components/Admin/Guidance/GuidanceEditor";

export default function AdminGuidancePage() {
  const { user } = useAuth();
  if (!user) return <Loading />;
  return <GuidanceEditor />;
}
