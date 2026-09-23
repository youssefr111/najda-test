import { Client } from "@stomp/stompjs";
import { firebaseAuth } from "@/firebase/client";
import { config } from "@/constants/config";

/**
 * The web app authenticates its WebSocket handshake implicitly, via the
 * httpOnly session cookie the browser attaches automatically. This app has
 * no such cookie, so the STOMP CONNECT frame carries a Bearer token instead.
 *
 * If your backend's WebSocket security config only ever checked that
 * cookie, add a small ChannelInterceptor that also accepts an
 * `Authorization` header on the CONNECT frame -- a few lines next to
 * whatever already verifies the Firebase token on your REST filter, not a
 * redesign.
 */
export function createWsClient(): Client {
  const client = new Client({
    brokerURL: config.wsUrl,
    reconnectDelay: 5000,
  });

  client.beforeConnect = async () => {
    const user = firebaseAuth.currentUser;
    const token = user ? await user.getIdToken() : null;
    client.connectHeaders = token ? { Authorization: `Bearer ${token}` } : {};
  };

  return client;
}
