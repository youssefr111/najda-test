import { firebaseApp } from "@/lib/firebase/client";

/**
 * Browser push through Firebase Cloud Messaging (free on the Spark plan).
 *
 * Everything here is browser-only and loaded lazily, so it never touches
 * server rendering and costs nothing for people who never turn push on.
 */

const SW_PATH = "/firebase-messaging-sw.js";

/** Public web config, handed to the service worker on the URL (it cannot read env vars). */
function serviceWorkerUrl(): string {
  const params = new URLSearchParams({
    apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY ?? "",
    authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN ?? "",
    projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID ?? "",
    messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID ?? "",
    appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID ?? "",
  });
  return `${SW_PATH}?${params.toString()}`;
}

/** Push needs service workers, the Notification API and a browser FCM supports (not iOS Safari tabs). */
export async function isPushSupported(): Promise<boolean> {
  if (typeof window === "undefined") return false;
  if (!("serviceWorker" in navigator) || !("Notification" in window)) return false;
  const { isSupported } = await import("firebase/messaging");
  return isSupported();
}

/** Registers the worker and returns this browser's FCM token (permission must already be granted). */
export async function getPushToken(): Promise<string | null> {
  const vapidKey = process.env.NEXT_PUBLIC_FIREBASE_VAPID_KEY;
  if (!vapidKey) {
    console.warn("NEXT_PUBLIC_FIREBASE_VAPID_KEY is not set: web push is disabled.");
    return null;
  }
  const { getMessaging, getToken } = await import("firebase/messaging");
  const registration = await navigator.serviceWorker.register(serviceWorkerUrl());
  await navigator.serviceWorker.ready;
  return getToken(getMessaging(firebaseApp), { vapidKey, serviceWorkerRegistration: registration });
}

/** Drops this browser from FCM: nothing can reach it until push is turned back on. */
export async function deletePushToken(): Promise<void> {
  const { getMessaging, deleteToken } = await import("firebase/messaging");
  await deleteToken(getMessaging(firebaseApp)).catch(() => false);
}

/** Messages that arrive while the page is open (the browser shows nothing itself then). */
export async function onForegroundPush(handler: () => void): Promise<() => void> {
  const { getMessaging, onMessage } = await import("firebase/messaging");
  return onMessage(getMessaging(firebaseApp), () => handler());
}
