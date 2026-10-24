import { useEffect, useRef } from "react";
import { useQueryClient, type QueryKey } from "@tanstack/react-query";
import { stompHub } from "@/lib/ws/hub";

/**
 * Keeps a query fresh by invalidating it whenever the backend publishes on a STOMP
 * topic -- the app's standard replacement for polling. Pass `null` to stay disconnected.
 *
 * It also refetches after a reconnect (and when a long-hidden tab returns), so an event
 * missed while the connection was down never leaves the screen stale.
 */
export function useLiveInvalidation(topic: string | null, queryKey: QueryKey) {
  const queryClient = useQueryClient();

  // Read through a ref so a freshly built queryKey array doesn't tear down the subscription every render.
  const queryKeyRef = useRef(queryKey);
  useEffect(() => {
    queryKeyRef.current = queryKey;
  });

  useEffect(() => {
    if (!topic) return;

    const refresh = () => queryClient.invalidateQueries({ queryKey: queryKeyRef.current });
    const stopTopic = stompHub.subscribe(topic, refresh);
    const stopCatchUp = stompHub.onReconnect(refresh);

    return () => {
      stopTopic();
      stopCatchUp();
    };
  }, [queryClient, topic]);
}
