import { useMutation, useQueryClient } from "@tanstack/react-query";
import { apiFetch } from "@/lib/api/client";
import type { Facility, CreateFacilityRequest } from "@/types/facility";

export function useCreateFacility() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (payload: CreateFacilityRequest) => apiFetch<Facility>("/api/facilities", { method: "POST", body: JSON.stringify(payload) }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["facilities"] }),
  });
}