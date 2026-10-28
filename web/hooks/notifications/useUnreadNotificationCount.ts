import { useQuery } from "@tanstack/react-query";
import { apiFetch } from "@/lib/api/client";
import useAuth from "@/hooks/auth/useAuth";
import { useLiveInvalidation } from "@/hooks/shared/useLiveInvalidation";

/**
 * The number on the bell. Kept live: the backend nudges /topic/users/{id}/notifications
 * on every new notification, which refetches everything under ["notifications"]
 * (this count and the list alike), so no polling is needed anywhere.
 */
export function useUnreadNotificationCount() {
  const { user } = useAuth();
  useLiveInvalidation(user ? `/topic/users/${user.id}/notifications` : null, ["notifications"]);

  return useQuery({
    queryKey: ["notifications", "unread"],
    queryFn: () => apiFetch<{ unreadCount: number }>("/api/notifications/unread-count"),
    select: (data) => data.unreadCount,
    enabled: !!user,
  });
}
