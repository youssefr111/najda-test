import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { apiFetch } from "@/lib/api/client";
import type { ResponseUnit } from "@/types/unit";
import type { User } from "@/types/user";
import type { FacilityType } from "@/types/facility";
import type { CreateEmployeeRequest, CreateEmployeeResponse } from "@/hooks/users/useCreateEmployee";

/** Which facility this manager runs and what that lets them create. */
export interface ManagerMe {
  facilityId: number;
  facilityName: string;
  facilityType: FacilityType;
  unitType: string;
  staffRoles: string[];
}

export interface UnitDeleteImpact {
  plateNumber: string;
  missionCount: number;
  activeMissionCount: number;
  onShift: boolean;
  /** DELETE: nothing is lost. ARCHIVE: it has history, so it is retired, not erased. */
  outcome: "DELETE" | "ARCHIVE";
  blocked: boolean;
}

export const useManagerMe = () =>
  useQuery({ queryKey: ["manager", "me"], queryFn: () => apiFetch<ManagerMe>("/api/manager/me"), staleTime: 5 * 60_000 });

export const useManagerUnits = () =>
  useQuery({ queryKey: ["manager", "units"], queryFn: () => apiFetch<ResponseUnit[]>("/api/manager/units") });

export function useSaveManagerUnit() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ unitId, plateNumber }: { unitId: number | null; plateNumber: string }) =>
      unitId == null
        ? apiFetch<ResponseUnit>("/api/manager/units", { method: "POST", body: JSON.stringify({ plateNumber }) })
        : apiFetch<ResponseUnit>(`/api/manager/units/${unitId}`, { method: "PATCH", body: JSON.stringify({ plateNumber }) }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["manager", "units"] });
      queryClient.invalidateQueries({ queryKey: ["units"] });
    },
  });
}

/** What deleting this unit would affect: loaded when the confirmation opens, so the warning is always current. */
export const useUnitDeleteImpact = (unitId: number | null) =>
  useQuery({
    queryKey: ["manager", "delete-impact", unitId],
    queryFn: () => apiFetch<UnitDeleteImpact>(`/api/manager/units/${unitId}/delete-impact`),
    enabled: unitId != null,
    gcTime: 0,
  });

export function useDeleteManagerUnit() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (unitId: number) => apiFetch<{ outcome: "DELETED" | "ARCHIVED" }>(`/api/manager/units/${unitId}`, { method: "DELETE" }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["manager", "units"] });
      queryClient.invalidateQueries({ queryKey: ["units"] });
    },
  });
}

export const useManagerStaff = () =>
  useQuery({ queryKey: ["manager", "staff"], queryFn: () => apiFetch<User[]>("/api/manager/staff") });

export function useCreateManagerStaff() {
  const queryClient = useQueryClient();
  return useMutation({
    // The server fills in the facility and checks the role: the request only says who the person is.
    mutationFn: (payload: Omit<CreateEmployeeRequest, "facilityId">) =>
      apiFetch<CreateEmployeeResponse>("/api/manager/staff", { method: "POST", body: JSON.stringify(payload) }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["manager", "staff"] }),
  });
}

export function useSetStaffEnabled() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ userId, enabled }: { userId: number; enabled: boolean }) =>
      apiFetch<unknown>(`/api/manager/staff/${userId}/${enabled ? "enable" : "disable"}`, { method: "POST" }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["manager", "staff"] }),
  });
}
