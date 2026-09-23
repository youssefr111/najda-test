import { useMutation, useQueryClient } from "@tanstack/react-query";
import { apiFetch } from "@/lib/api/client";
import type { Mission, AssignUnitMissionRequest } from "@/types/mission";

export function useAssignUnit() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (payload: AssignUnitMissionRequest) =>
      apiFetch<Mission>("/api/missions/assign-unit", { method: "POST", body: JSON.stringify(payload) }),
    onSuccess: (_data, variables) => {
      // The incident just left the queue and the unit just left the
      // available pool -- both are now stale.
      queryClient.invalidateQueries({ queryKey: ["incidents", "queue"] });
      queryClient.invalidateQueries({ queryKey: ["incidents", "active"] });
      queryClient.invalidateQueries({ queryKey: ["missions", "incident", variables.incidentId] });
      queryClient.invalidateQueries({ queryKey: ["units"] });
    },
  });
}