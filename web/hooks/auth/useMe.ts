import { useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { apiFetch } from "@/lib/api/client";
import { useAuthStore } from "@/store/auth-store";
import type { User } from "@/types/user";

// Fetches GET /api/auth/me from the Spring backend — the source of truth
// for role/name/etc — and mirrors the result into Zustand for cheap access
// from anywhere in the tree.
export function useMe() {
  const firebaseUser = useAuthStore((s) => s.firebaseUser);
  const setProfile = useAuthStore((s) => s.setProfile);

  const query = useQuery({
    queryKey: ["me", firebaseUser?.uid],
    queryFn: () => apiFetch<User>("/api/auth/me"),
    enabled: !!firebaseUser,
  });

  useEffect(() => {
    if (query.data) setProfile(query.data);
  }, [query.data, setProfile]);

  return query;
}