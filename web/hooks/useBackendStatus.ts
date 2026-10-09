"use client";

import { useEffect, useState } from "react";

export type BackendStatus = "checking" | "waking" | "degraded" | "unreachable" | "online" | "offline";

type Health = {
  ok: boolean;
  components: Record<string, string> | null;
  latencyMs: number | null;
  at: number;
  unreachable: boolean;
};

const UNREACHABLE_AFTER_MS = 90_000;

type Message =
  | { type: "health"; health: Health }
  | { type: "request" }
  | { type: "refresh" };

const CHANNEL = "najda-health";
const LOCK = "najda-health-leader";
const HEALTHY_MS = 60_000;

async function ping(stop: AbortSignal): Promise<Health> {
  const start = performance.now();
  try {
    const res = await fetch(`${process.env.NEXT_PUBLIC_API_BASE_URL}/api/status`, {
      cache: "no-store",
      signal: AbortSignal.any([stop, AbortSignal.timeout(65_000)]),
    });
    const body = await res.json().catch(() => null);
    return { ok: res.ok, components: body?.components ?? null, latencyMs: Math.round(performance.now() - start), at: Date.now(), unreachable: false };
  } catch {
    return { ok: false, components: null, latencyMs: null, at: Date.now(), unreachable: false };
  }
}

export function useBackendStatus() {
  const [health, setHealth] = useState<Health | null>(null);
  const [slow, setSlow] = useState(false);
  const [browserOnline, setBrowserOnline] = useState(true);

  useEffect(() => {
    const channel = new BroadcastChannel(CHANNEL);
    const stop = new AbortController();
    let isLeader = false;
    let last: Health | null = null;
    let wake: (() => void) | null = null;

    const send = (m: Message) => channel.postMessage(m);

    const publish = (h: Health) => {
      last = h;
      setHealth(h);
      send({ type: "health", health: h });
    };

    const sleep = (ms: number) =>
      new Promise<void>((resolve) => {
        const id = setTimeout(resolve, ms);
        wake = () => {
          clearTimeout(id);
          resolve();
        };
      });

    async function lead() {
      isLeader = true;
      let failures = 0;
      let failingSince: number | null = null;

      while (!stop.signal.aborted) {
        const startedAt = Date.now();
        const h = await ping(stop.signal);
        if (stop.signal.aborted) break;

        const reached = h.ok || h.components !== null;
        if (reached) failingSince = null;
        else failingSince ??= startedAt;

        publish({
          ...h,
          unreachable: failingSince !== null && Date.now() - failingSince > UNREACHABLE_AFTER_MS,
        });

        failures = h.ok ? 0 : failures + 1;
        await sleep(h.ok ? HEALTHY_MS : Math.min(3_000 * 1.5 ** failures, 30_000));
      }
      isLeader = false;
    }

    channel.onmessage = (e: MessageEvent<Message>) => {
      const m = e.data;
      if (m.type === "health") {
        last = m.health;
        setHealth(m.health);
      } else if (m.type === "request" && isLeader && last) {
        send({ type: "health", health: last });
      } else if (m.type === "refresh" && isLeader) {
        wake?.();
      }
    };

    // Only one tab at a time gets this callback; the rest wait for the lock.
    if ("locks" in navigator) {
      navigator.locks.request(LOCK, { signal: stop.signal }, lead).catch(() => {});
    } else {
      lead(); // very old browsers: fall back to per-tab polling
    }

    send({ type: "request" }); // ask the leader for its latest result

    // Re-check right away when the user comes back to a tab
    const onVisible = () => {
      if (document.visibilityState !== "visible") return;
      if (isLeader) wake?.();
      else send({ type: "refresh" });
    };
    document.addEventListener("visibilitychange", onVisible);

    return () => {
      document.removeEventListener("visibilitychange", onVisible);
      stop.abort();
      wake?.();
      channel.close();
    };
  }, []);

  // no result after 3s => probably a cold start
  useEffect(() => {
    if (health) return;
    const id = setTimeout(() => setSlow(true), 3_000);
    return () => clearTimeout(id);
  }, [health]);

  useEffect(() => {
    const update = () => setBrowserOnline(navigator.onLine);
    update();
    window.addEventListener("online", update);
    window.addEventListener("offline", update);
    return () => {
      window.removeEventListener("online", update);
      window.removeEventListener("offline", update);
    };
  }, []);

  let status: BackendStatus;
  if (!browserOnline) status = "offline";
  else if (health?.ok) status = "online";
  else if (health?.components) status = "degraded";
  else if (health?.unreachable) status = "unreachable";
  else if (health || slow) status = "waking";
  else status = "checking";

  return {
    status,
    components: health?.components ?? null,
    latencyMs: health?.latencyMs ?? null,
    lastChecked: health?.at ?? null,
  };
}