import { useQuery } from "@tanstack/react-query";
import { apiFetch } from "@/api/client";
import type { Mission } from "@/types/mission";

export function useMyMissions() {
  return useQuery({
    queryKey: ["missions", "mine"],
    queryFn: () => apiFetch<Mission[]>("/api/missions/mine"),
    refetchInterval: 5_000,
  });
}
