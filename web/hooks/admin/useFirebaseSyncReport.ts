import { useQuery } from "@tanstack/react-query";
import { apiFetch } from "@/lib/api/client";
import type { FirebaseSyncReport } from "@/types/firebaseSync";

export function useFirebaseSyncReport(enabled: boolean) {
  return useQuery({
    queryKey: ["firebase-sync-report"],
    queryFn: () => apiFetch<FirebaseSyncReport>("/api/admin/firebase-sync/report"),
    enabled,
  });
}