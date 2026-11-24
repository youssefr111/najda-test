import { useMutation, useQueryClient } from "@tanstack/react-query";
import { apiFetch } from "@/lib/api/client";

/** Mark one notification, or all of them, as read. */
export function useNotificationActions() {
  const queryClient = useQueryClient();
  const refresh = () => queryClient.invalidateQueries({ queryKey: ["notifications"] });

  const markRead = useMutation({
    mutationFn: (id: number) => apiFetch<void>(`/api/notifications/${id}/read`, { method: "POST" }),
    onSuccess: refresh,
  });

  const markAllRead = useMutation({
    mutationFn: () => apiFetch<void>("/api/notifications/read-all", { method: "POST" }),
    onSuccess: refresh,
  });

  return { markRead, markAllRead };
}
