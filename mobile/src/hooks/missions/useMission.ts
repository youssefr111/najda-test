import { useMyMissions } from "./useMyMissions";

/** Convenience selector for a single mission out of the "mine" list, for the detail screen. */
export function useMission(missionId: number | null) {
  const query = useMyMissions();
  const mission = query.data?.find((m) => m.id === missionId) ?? null;
  return { ...query, data: mission };
}
