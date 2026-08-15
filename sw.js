/* NUS Companion V66.3 Service Worker
 *
 * This file MUST remain a service worker only.
 * It receives Web Push events while the PWA is not open and displays
 * the notification on the device.
 */

const APP_ICON = "/assets/icon.svg";

self.addEventListener("install", event => {
  self.skipWaiting();
});

self.addEventListener("activate", event => {
  event.waitUntil(self.clients.claim());
});

self.addEventListener("push", event => {
  let payload = {};

  try {
    payload = event.data ? event.data.json() : {};
  } catch {
    payload = {
      title: "NUS Companion",
      body: event.data ? event.data.text() : "You have a new reminder."
    };
  }

  const title = payload.title || "NUS Companion";
  const options = {
    body: payload.body || "You have a new reminder.",
    icon: payload.icon || APP_ICON,
    badge: payload.badge || APP_ICON,
    tag: payload.tag || "nus-companion-push",
    renotify: true,
    data: {
      href: payload.href || "/index.html"
    }
  };

  event.waitUntil(
    self.registration.showNotification(title, options)
  );
});

self.addEventListener("notificationclick", event => {
  event.notification.close();

  const target = event.notification?.data?.href || "/index.html";

  event.waitUntil(
    self.clients.matchAll({
      type: "window",
      includeUncontrolled: true
    }).then(clients => {
      const absoluteUrl = new URL(target, self.location.origin).href;

      for (const client of clients) {
        if ("focus" in client) {
          return client.navigate(absoluteUrl).then(() => client.focus());
        }
      }

      if (self.clients.openWindow) {
        return self.clients.openWindow(absoluteUrl);
      }

      return undefined;
    })
  );
});
