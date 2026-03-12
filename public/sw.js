/// <reference lib="webworker" />

self.addEventListener("push", (event) => {
  if (!event.data) return;

  let payload;
  try {
    payload = event.data.json();
  } catch {
    payload = {
      title: "SuperPatch Follow-Up",
      body: event.data.text(),
      data: {},
    };
  }

  const { title, body, data } = payload;

  event.waitUntil(
    self.registration.showNotification(title || "Follow-Up Reminder", {
      body: body || "You have a follow-up due",
      icon: "/SuperPatch-SYMBL-3_SuperPatch_Logo_SYMBL_WHT.png",
      badge: "/SuperPatch-SYMBL-3_SuperPatch_Logo_SYMBL_WHT.png",
      tag: data?.contactId || "followup",
      renotify: true,
      data: data || {},
    })
  );
});

self.addEventListener("notificationclick", (event) => {
  event.notification.close();

  const url = event.notification.data?.url || "/contacts";

  event.waitUntil(
    self.clients.matchAll({ type: "window", includeUncontrolled: true }).then((clientList) => {
      for (const client of clientList) {
        if (client.url.includes(self.location.origin) && "focus" in client) {
          client.navigate(url);
          return client.focus();
        }
      }
      return self.clients.openWindow(url);
    })
  );
});

self.addEventListener("install", () => {
  self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  event.waitUntil(self.clients.claim());
});
