import { Client } from "@stomp/stompjs";

export function createWsClient(): Client {
  const client = new Client({
    brokerURL: process.env.NEXT_PUBLIC_WS_URL,
    reconnectDelay: 5000,
  });
  return client;
}