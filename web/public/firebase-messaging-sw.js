/* Firebase Cloud Messaging service worker.
 *
 * Shows push notifications while the site is closed or in the background.
 * The backend sends a `notification` payload, so the Firebase SDK draws the
 * notification itself; this file only boots the SDK and decides what a click does.
 *
 * The (public) web config arrives on the registration URL -- see
 * lib/firebase/messaging.ts -- because a service worker cannot read env vars.
 */
importScripts("https://www.gstatic.com/firebasejs/11.10.0/firebase-app-compat.js");
importScripts("https://www.gstatic.com/firebasejs/11.10.0/firebase-messaging-compat.js");

const params = new URL(self.location.href).searchParams;

firebase.initializeApp({
  apiKey: params.get("apiKey"),
  authDomain: params.get("authDomain"),
  projectId: params.get("projectId"),
  messagingSenderId: params.get("messagingSenderId"),
  appId: params.get("appId"),
});

// Instantiating messaging is what makes the SDK display background pushes.
firebase.messaging();

self.addEventListener("notificationclick", (event) => {
  event.notification.close();
  const target = new URL("/notifications", self.location.origin).href;

  event.waitUntil(
    self.clients.matchAll({ type: "window", includeUncontrolled: true }).then((windows) => {
      // Reuse an open tab if there is one; otherwise open the inbox.
      for (const client of windows) {
        if ("focus" in client) {
          client.focus();
          if ("navigate" in client) client.navigate(target);
          return undefined;
        }
      }
      return self.clients.openWindow(target);
    }),
  );
});
