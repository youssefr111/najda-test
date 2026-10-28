import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { apiFetch } from "@/lib/api/client";
import { isKycPending, type KycState, type KycStatus } from "@/lib/kyc/kyc";

export const KYC_KEY = ["kyc", "status"] as const;

/** The signed-in person's verification status. Checks again every few seconds while the provider is still working. */
export function useKycStatus(enabled = true) {
  return useQuery({
    queryKey: KYC_KEY,
    queryFn: () => apiFetch<KycState>("/api/kyc/status"),
    enabled,
    staleTime: 30_000,
    refetchOnWindowFocus: true, // coming back from the provider's page should refresh it
    refetchInterval: (query) => (isKycPending(query.state.data?.status) ? 3_000 : false),
  });
}

/** Asks the backend for a hosted verification page, then leaves for it. */
export function useStartKyc() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: () => apiFetch<{ url?: string | null; status?: KycStatus }>("/api/kyc/session", { method: "POST" }),
    onSuccess: ({ url }) => {
      if (url) window.location.assign(url);
      else queryClient.invalidateQueries({ queryKey: KYC_KEY }); // already verified: just show it
    },
  });
}

/** Admin: set someone's status by hand (testing, and the fallback when the scanner cannot read an ID). Audited server-side. */
export function useAdminSetKyc() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ userId, status, note }: { userId: number; status: KycStatus; note?: string }) =>
      apiFetch<KycState>(`/api/kyc/admin/${userId}/status`, { method: "POST", body: JSON.stringify({ status, note }) }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["users"] });
      queryClient.invalidateQueries({ queryKey: KYC_KEY });
    },
  });
}
