"use client";

function urlBase64ToUint8Array(base64String: string): Uint8Array {
  const padding = "=".repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, "+").replace(/_/g, "/");
  const rawData = window.atob(base64);
  const outputArray = new Uint8Array(rawData.length);
  for (let i = 0; i < rawData.length; ++i) {
    outputArray[i] = rawData.charCodeAt(i);
  }
  return outputArray;
}

export async function subscribeUserToCallPush(): Promise<{
  ok: boolean;
  error?: string;
}> {
  try {
    if (typeof window === "undefined") {
      return { ok: false, error: "Not running in a browser." };
    }
    if (!("serviceWorker" in navigator) || !("PushManager" in window)) {
      return {
        ok: false,
        error: "Push notifications are not supported in this browser.",
      };
    }
    if (!("Notification" in window)) {
      return {
        ok: false,
        error: "Notifications API is unavailable in this browser.",
      };
    }

    const vapidPublicKey = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY;
    if (!vapidPublicKey) {
      return {
        ok: false,
        error: "Missing NEXT_PUBLIC_VAPID_PUBLIC_KEY.",
      };
    }

    let permission = Notification.permission;
    if (permission === "default") {
      permission = await Notification.requestPermission();
    }

    if (permission !== "granted") {
      return {
        ok: false,
        error: "Notification permission was not granted.",
      };
    }

    const registration = await navigator.serviceWorker.ready;
    let subscription = await registration.pushManager.getSubscription();

    if (!subscription) {
      const applicationServerKey = urlBase64ToUint8Array(
        vapidPublicKey,
      ) as unknown as BufferSource;

      subscription = await registration.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey,
      });
    }

    const res = await fetch("/api/push/subscription", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(subscription.toJSON()),
    });

    const data = await res.json().catch(() => ({}));
    if (!res.ok) {
      return {
        ok: false,
        error:
          typeof data?.error === "string"
            ? data.error
            : "Failed to save push subscription on server.",
      };
    }

    return { ok: true };
  } catch (err) {
    console.error("[subscribeUserToCallPush]", err);
    return {
      ok: false,
      error:
        err instanceof Error
          ? err.message
          : "Could not enable push notifications.",
    };
  }
}
