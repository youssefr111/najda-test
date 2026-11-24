import { useInfiniteQuery } from "@tanstack/react-query";
import { apiFetch } from "@/lib/api/client";
import useAuth from "@/hooks/auth/useAuth";
import type { NotificationPage } from "@/types/notification";

const PAGE_SIZE = 20;

/** The inbox, newest first, loaded a page at a time. */
export function useNotifications({ enabled = true }: { enabled?: boolean } = {}) {
  const { user } = useAuth();

  return useInfiniteQuery({
    queryKey: ["notifications", "list"],
    queryFn: ({ pageParam }) =>
      apiFetch<NotificationPage>(`/api/notifications?limit=${PAGE_SIZE}${pageParam ? `&before=${pageParam}` : ""}`),
    initialPageParam: null as number | null,
    getNextPageParam: (last) => last.nextBefore ?? undefined,
    enabled: !!user && enabled,
  });
}
