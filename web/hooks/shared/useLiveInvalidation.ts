import { useEffect, useRef } from "react";
import { useQueryClient, type QueryKey } from "@tanstack/react-query";
import { createWsClient } from "@/lib/ws/client";

/**
 * Keeps a query fresh by invalidating it whenever the backend publishes on a STOMP
 * topic -- the app's standard replacement for polling. Pass `null` to stay disconnected.
 */
export function useLiveInvalidation(topic: string | null, queryKey: QueryKey) {
  const queryClient = useQueryClient();

  // Read through a ref so a freshly built queryKey array doesn't tear down the socket every render.
  const queryKeyRef = useRef(queryKey);
  useEffect(() => {
    queryKeyRef.current = queryKey;
  });

  useEffect(() => {
    if (!topic) return;

    const client = createWsClient();
    client.onConnect = () => {
      client.subscribe(topic, () => {
        queryClient.invalidateQueries({ queryKey: queryKeyRef.current });
      });
    };
    client.activate();
    return () => { client.deactivate(); };
  }, [queryClient, topic]);
}