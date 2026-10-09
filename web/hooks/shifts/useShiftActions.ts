import { useMutation, useQueryClient } from "@tanstack/react-query";
import { apiFetch } from "@/lib/api/client";
import type { ShiftAssignmentResponse } from "@/types/shift";

function useShiftMutation<TBody = void, TResult = ShiftAssignmentResponse>(path: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (body?: TBody) =>
      apiFetch<TResult>(path, { method: "POST", body: body !== undefined ? JSON.stringify(body) : undefined }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["shifts"] });
      queryClient.invalidateQueries({ queryKey: ["units"] });
    },
  });
}

export function useStartShift() { return useShiftMutation<{ unitId: number }>("/api/shifts/start"); }
export function useJoinShift() { return useShiftMutation<{ unitId: number }>("/api/shifts/join"); }
export function useLeaveShift() { return useShiftMutation<void, { message: string }>("/api/shifts/leave"); }
export function useEndShift() { return useShiftMutation<void, { message: string }>("/api/shifts/end"); }