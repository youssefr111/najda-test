import { Client, type IMessage, type StompSubscription } from "@stomp/stompjs";

type MessageHandler = (message: IMessage) => void;

interface TopicEntry {
  handlers: Set<MessageHandler>;
  subscription: StompSubscription | null;
}

/** How long the connection is kept after the last subscriber leaves (page changes re-subscribe at once). */
const IDLE_DISCONNECT_MS = 10_000;

/** A tab that was hidden at least this long may have missed events: catch up when it is shown again. */
const STALE_AFTER_HIDDEN_MS = 30_000;

/**
 * One shared, self-healing STOMP connection for the whole page.
 *
 * Before this, every hook opened its own socket with no heartbeat: a connection that went idle (a proxy
 * or the host dropping it silently, a laptop waking up, a phone switching networks) just stopped
 * delivering events and nothing noticed -- screens stayed stale until a manual refresh.
 *
 *  - ONE socket, and one STOMP subscription per topic, fanned out to every interested hook.
 *  - Heartbeats both ways (the backend answers them): a dead socket is detected within ~20 s and reconnected.
 *  - Every subscription is restored after a reconnect.
 *  - `onReconnect` listeners run after any reconnect and when a long-hidden tab becomes visible, so
 *    callers refetch whatever they could have missed while disconnected.
 */
class StompHub {
  private client: Client | null = null;
  private readonly topics = new Map<string, TopicEntry>();
  private readonly reconnectListeners = new Set<() => void>();
  private hasConnected = false;
  private idleTimer: ReturnType<typeof setTimeout> | null = null;
  private hiddenAt: number | null = null;
  private browserListenersAttached = false;

  /** Calls `handler` for every message on `topic`. Returns the unsubscribe function. */
  subscribe(topic: string, handler: MessageHandler): () => void {
    this.cancelIdleDisconnect();

    let entry = this.topics.get(topic);
    if (!entry) {
      entry = { handlers: new Set(), subscription: null };
      this.topics.set(topic, entry);
    }
    entry.handlers.add(handler);

    this.ensureClient();
    if (this.client?.connected) this.attach(topic, entry);

    return () => {
      entry.handlers.delete(handler);
      if (entry.handlers.size === 0) {
        entry.subscription?.unsubscribe();
        this.topics.delete(topic);
      }
      this.scheduleIdleDisconnectIfUnused();
    };
  }

  /** Runs after the connection was re-established (not the first connect), and when a long-hidden tab returns. */
  onReconnect(listener: () => void): () => void {
    this.reconnectListeners.add(listener);
    return () => {
      this.reconnectListeners.delete(listener);
      this.scheduleIdleDisconnectIfUnused();
    };
  }

  private attach(topic: string, entry: TopicEntry) {
    if (entry.subscription || !this.client?.connected) return;
    entry.subscription = this.client.subscribe(topic, (message) => {
      entry.handlers.forEach((handler) => handler(message));
    });
  }

  private ensureClient() {
    if (this.client) return;

    const client = new Client({
      brokerURL: process.env.NEXT_PUBLIC_WS_URL,
      reconnectDelay: 3000,
      heartbeatIncoming: 10_000,
      heartbeatOutgoing: 10_000,
      connectionTimeout: 10_000,
    });

    client.onConnect = () => {
      // A new socket starts with no subscriptions: restore every topic that is still wanted.
      for (const [topic, entry] of this.topics) {
        entry.subscription = null;
        this.attach(topic, entry);
      }
      if (this.hasConnected) this.notifyReconnected();
      this.hasConnected = true;
    };

    client.onWebSocketClose = () => {
      for (const entry of this.topics.values()) entry.subscription = null;
    };

    client.activate();
    this.client = client;
    this.attachBrowserListeners();
  }

  private notifyReconnected() {
    this.reconnectListeners.forEach((listener) => listener());
  }

  private attachBrowserListeners() {
    if (this.browserListenersAttached || typeof window === "undefined") return;
    this.browserListenersAttached = true;

    document.addEventListener("visibilitychange", () => {
      if (document.visibilityState === "hidden") {
        this.hiddenAt = Date.now();
        return;
      }
      const hiddenFor = this.hiddenAt ? Date.now() - this.hiddenAt : 0;
      this.hiddenAt = null;
      if (hiddenFor > STALE_AFTER_HIDDEN_MS && this.client) {
        // Timers were throttled while hidden: assume events were missed.
        this.notifyReconnected();
        if (!this.client.connected) void this.client.forceDisconnect();
      }
    });

    // The network came back: do not wait for the next retry tick.
    window.addEventListener("online", () => {
      if (this.client && !this.client.connected) void this.client.forceDisconnect();
    });
  }

  private scheduleIdleDisconnectIfUnused() {
    if (this.topics.size > 0 || this.reconnectListeners.size > 0 || this.idleTimer) return;
    this.idleTimer = setTimeout(() => {
      this.idleTimer = null;
      if (this.topics.size > 0 || this.reconnectListeners.size > 0) return;
      void this.client?.deactivate();
      this.client = null;
      this.hasConnected = false;
    }, IDLE_DISCONNECT_MS);
  }

  private cancelIdleDisconnect() {
    if (!this.idleTimer) return;
    clearTimeout(this.idleTimer);
    this.idleTimer = null;
  }
}

export const stompHub = new StompHub();
