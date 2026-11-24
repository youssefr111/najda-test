import { useMutation, useQueryClient } from "@tanstack/react-query";
import { apiFetch } from "@/lib/api/client";
import type { Mission, AssignUnitMissionRequest } from "@/types/mission";

export function useAssignUnit() {
  const queryClient = useQueryClient();

  // Runs on success AND failure: after a conflict ("unit no longer available", "just updated by
  // someone else") the screen must show the current state, not the stale one the dispatcher acted on.
  const refreshDispatchState = (incidentId: number) => {
    queryClient.invalidateQueries({ queryKey: ["incidents", "queue"] });
    queryClient.invalidateQueries({ queryKey: ["incidents", "active"] });
    queryClient.invalidateQueries({ queryKey: ["missions", "incident", incidentId] });
    queryClient.invalidateQueries({ queryKey: ["units"] });
  };

  return useMutation({
    mutationFn: (payload: AssignUnitMissionRequest) =>
      apiFetch<Mission>("/api/missions/assign-unit", { method: "POST", body: JSON.stringify(payload) }),
    onSettled: (_data, _error, variables) => refreshDispatchState(variables.incidentId),
  });
}