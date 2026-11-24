import { keepPreviousData, useQuery } from "@tanstack/react-query";
import { apiFetch } from "@/lib/api/client";
import { useLiveInvalidation } from "@/hooks/shared/useLiveInvalidation";
import type { Facility, FacilityType } from "@/types/facility";

/** What the components use: flat and predictable. */
export interface FacilitiesPage {
  content: Facility[];
  totalElements: number;
  totalPages: number;
  number: number;
  size: number;
}

/**
 * What Spring sends. Newer Spring Data nests the paging details under `page`
 * (`{ content, page: { size, number, totalElements, totalPages } }`); older versions put them at the top.
 * Both are accepted and flattened here, once, so nothing else cares.
 */
interface RawPage {
  content: Facility[];
  page?: { size: number; number: number; totalElements: number; totalPages: number };
  totalElements?: number;
  totalPages?: number;
  number?: number;
  size?: number;
}

function flatten(raw: RawPage): FacilitiesPage {
  return {
    content: raw.content ?? [],
    totalElements: raw.page?.totalElements ?? raw.totalElements ?? raw.content?.length ?? 0,
    totalPages: raw.page?.totalPages ?? raw.totalPages ?? 1,
    number: raw.page?.number ?? raw.number ?? 0,
    size: raw.page?.size ?? raw.size ?? raw.content?.length ?? 0,
  };
}

/** One server-filtered page of facilities for the admin table. */
export function useFacilitiesPage({
  page, size, type, q,
}: { page: number; size: number; type?: FacilityType; q?: string }) {
  useLiveInvalidation("/topic/facilities", ["facilities"]);

  const params = new URLSearchParams({ page: String(page), size: String(size) });
  if (type) params.set("type", type);
  if (q) params.set("q", q);

  return useQuery({
    queryKey: ["facilities", "page", page, size, type ?? "all", q ?? ""],
    queryFn: async () => flatten(await apiFetch<RawPage>(`/api/facilities/page?${params.toString()}`)),
    placeholderData: keepPreviousData, // keep showing the old page while the next one loads
  });
}
