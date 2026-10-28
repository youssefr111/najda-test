import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { apiFetch } from "@/lib/api/client";
import { legalSlug } from "@/lib/legal/slug";
import type {
  ConsentStatus,
  LegalDocument,
  LegalDocumentType,
  LegalVersionSummary,
  PublishLegalRequest,
} from "@/types/legal";

export const consentKey = ["legal", "consent"] as const;
export const documentKey = (type: LegalDocumentType) => ["legal", "document", type] as const;
export const versionsKey = (type: LegalDocumentType) => ["legal", "versions", type] as const;

const base = (type: LegalDocumentType) => `/api/legal/documents/${legalSlug(type)}`;

/** What the signed-in person still has to accept. Re-checked whenever the window regains focus. */
export function useConsentStatus(enabled: boolean) {
  return useQuery({
    queryKey: consentKey,
    queryFn: () => apiFetch<ConsentStatus>("/api/legal/consent"),
    enabled,
    staleTime: 60_000,
  });
}

export function useAcceptConsent() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (versionIds: number[]) =>
      apiFetch<ConsentStatus>("/api/legal/consent", {
        method: "POST",
        body: JSON.stringify({ versionIds, source: "WEB" }),
      }),
    onSuccess: (status) => queryClient.setQueryData(consentKey, status),
    // A 409 means a newer version came out meanwhile: show what is pending now.
    onError: () => queryClient.invalidateQueries({ queryKey: consentKey }),
  });
}

/** The version in force, always fresh (used by the admin editor). */
export function useLegalDocument(type: LegalDocumentType) {
  return useQuery({
    queryKey: documentKey(type),
    queryFn: () => apiFetch<LegalDocument>(base(type)),
    staleTime: 0,
  });
}

export function useLegalVersions(type: LegalDocumentType) {
  return useQuery({
    queryKey: versionsKey(type),
    queryFn: () => apiFetch<LegalVersionSummary[]>(`${base(type)}/versions`),
  });
}

export function fetchLegalVersion(type: LegalDocumentType, version: number) {
  return apiFetch<LegalDocument>(`${base(type)}/versions/${version}`);
}

export function usePublishLegal(type: LegalDocumentType) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (request: PublishLegalRequest) =>
      apiFetch<LegalDocument>(`${base(type)}/versions`, { method: "POST", body: JSON.stringify(request) }),
    onSuccess: (published) => {
      queryClient.setQueryData(documentKey(type), published);
      queryClient.invalidateQueries({ queryKey: versionsKey(type) });
      queryClient.invalidateQueries({ queryKey: consentKey });
    },
  });
}
