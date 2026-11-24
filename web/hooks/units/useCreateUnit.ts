import { useMutation, useQueryClient } from "@tanstack/react-query";
import { apiFetch } from "@/lib/api/client";
import type { ResponseUnit, CreateResponseUnitRequest } from "@/types/unit";

export function useCreateUnit() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (payload: CreateResponseUnitRequest) => apiFetch<ResponseUnit>("/api/units", { method: "POST", body: JSON.stringify(payload) }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["units"] }),
  });
}