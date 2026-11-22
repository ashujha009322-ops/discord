self.addEventListener("install", () => {
  self.skipWaiting();
});

// Activate the new service worker immediately.
self.addEventListener("activate", (event) => {
  event.waitUntil(self.clients.claim());
});

// Handle incoming push notifications.
self.addEventListener("push", (event) => {
  if (!event.data) return;

  let data = {};

  try {
    data = event.data.json();
  } catch (err) {
    console.warn("[ServiceWorker] Invalid push payload:", err);

    data = {
      title: "Incoming Call",
      body: "Someone is calling you.",
      url: "/calling",
    };
  }

  const title = data.title || "Incoming Call";

  const options = {
    body: data.body || "Tap to open the app and respond.",
    icon: "/icon-192x192.png",
    badge: "/icon-192x192.png",

    // Replace older notifications for the same call.
    tag: data.callId || "incoming-call",
    renotify: true,
    requireInteraction: true,

    // Preserve call information for notification clicks.
    data: {
      url: data.url || "/calling",
      callId: data.callId || "",
      fromUserId: data.fromUserId || "",
      fromUsername: data.fromUsername || "",
      fromDisplayName: data.fromDisplayName || "",
      mode: data.mode === "video" ? "video" : "audio",
    },

    actions: [
      { action: "accept", title: "Accept" },
      { action: "decline", title: "Decline" },
    ],
  };

  event.waitUntil(self.registration.showNotification(title, options));
});

// Handle notification clicks and actions.
self.addEventListener("notificationclick", (event) => {
  event.notification.close();

  const notifData = event.notification.data || {};

  // Determine the requested action.
  const action =
    event.action === "accept"
      ? "accept"
      : event.action === "decline"
        ? "decline"
        : "open";

  // Safely construct a same-origin destination URL.
  let targetUrl;

  try {
    const url = new URL(notifData.url || "/calling", self.location.origin);

    if (url.origin !== self.location.origin) {
      throw new Error("Invalid notification URL origin.");
    }

    url.searchParams.set("pushAction", action);
    url.searchParams.set("callId", String(notifData.callId || ""));
    url.searchParams.set("fromUserId", String(notifData.fromUserId || ""));
    url.searchParams.set("fromUsername", String(notifData.fromUsername || ""));
    url.searchParams.set(
      "fromDisplayName",
      String(notifData.fromDisplayName || ""),
    );
    url.searchParams.set(
      "mode",
      notifData.mode === "video" ? "video" : "audio",
    );

    targetUrl = url.toString();
  } catch (err) {
    console.error("[ServiceWorker] Invalid notification URL:", err);
    targetUrl = new URL("/calling", self.location.origin).toString();
  }

  event.waitUntil(
    (async () => {
      try {
        // Find an existing application window.
        const clientList = await self.clients.matchAll({
          type: "window",
          includeUncontrolled: true,
        });

        const client = clientList[0];

        if (client) {
          try {
            // Navigate the existing tab to the calling page.
            if ("navigate" in client && typeof client.navigate === "function") {
              await client.navigate(targetUrl);
            }
          } catch (err) {
            console.warn("[ServiceWorker] Client navigation failed:", err);
          }

          // Bring the existing tab into focus.
          return await client.focus();
        }

        // No existing application window: open a new one.
        if (self.clients.openWindow) {
          return await self.clients.openWindow(targetUrl);
        }
      } catch (err) {
        console.error("[ServiceWorker] Notification click failed:", err);
      }
    })(),
  );
});
