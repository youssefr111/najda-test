import { useMutation, useQueryClient } from "@tanstack/react-query";
import { apiFetch } from "@/lib/api/client";

export function useSyncFirebaseUser() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (uid: string) => apiFetch(`/api/admin/firebase-sync/sync-user/${uid}`, { method: "POST" }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["firebase-sync-report"] });
      queryClient.invalidateQueries({ queryKey: ["users"] });
    },
  });
}

export function useDeleteOrphanedFirebaseUser() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (uid: string) => apiFetch<void>(`/api/admin/firebase-sync/firebase-user/${uid}`, { method: "DELETE" }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["firebase-sync-report"] }),
  });
}

export function useDeleteOrphanedPostgresUser() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (userId: number) => apiFetch<void>(`/api/admin/firebase-sync/postgres-user/${userId}`, { method: "DELETE" }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["firebase-sync-report"] });
      queryClient.invalidateQueries({ queryKey: ["users"] });
    },
  });
}