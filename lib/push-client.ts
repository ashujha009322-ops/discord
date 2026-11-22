"use client";

export type PushPermissionStatus =
  | "granted"
  | "denied"
  | "default"
  | "unsupported";

type PushResult = {
  ok: boolean;
  error?: string;
};

type PushSyncResult = {
  synced: boolean;
  error?: string;
};

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

/**
 * Checks browser push notification permission and support.
 */
export function getPushPermissionState(): PushPermissionStatus {
  if (typeof window === "undefined") {
    return "unsupported";
  }

  if (
    !("serviceWorker" in navigator) ||
    !("PushManager" in window) ||
    !("Notification" in window)
  ) {
    return "unsupported";
  }

  return Notification.permission;
}

/**
 * Gets or creates a push subscription.
 *
 * IMPORTANT:
 * subscribe() should only be reached through an explicit user action
 * or when permission is already granted.
 */
async function getOrCreatePushSubscription(): Promise<PushSubscription> {
  const vapidPublicKey = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY;

  if (!vapidPublicKey) {
    throw new Error("Missing NEXT_PUBLIC_VAPID_PUBLIC_KEY.");
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

  return subscription;
}

/**
 * Saves the push subscription on the server.
 */
async function persistSubscriptionToServer(
  subscription: PushSubscription,
): Promise<PushResult> {
  const res = await fetch("/api/push/subscription", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
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
}

/**
 * QUIET BACKGROUND SYNC
 *
 * - Never requests notification permission.
 * - Does nothing unless permission is already granted.
 * - Refreshes an existing subscription or creates one if necessary.
 * - Saves the subscription on the server.
 *
 * Safe to call when the app loads or when the user returns.
 */
export async function syncExistingPushSubscription(): Promise<PushSyncResult> {
  try {
    if (getPushPermissionState() !== "granted") {
      return { synced: false };
    }

    const subscription = await getOrCreatePushSubscription();

    const saved = await persistSubscriptionToServer(subscription);

    if (!saved.ok) {
      return {
        synced: false,
        error: saved.error,
      };
    }

    return { synced: true };
  } catch (err) {
    console.error("[syncExistingPushSubscription]", err);

    return {
      synced: false,
      error:
        err instanceof Error
          ? err.message
          : "Failed to sync existing push subscription.",
    };
  }
}

/**
 * EXPLICIT USER ACTION
 *
 * - Requests permission when permission is "default".
 * - Never silently requests permission.
 * - Creates or retrieves the push subscription.
 * - Saves the subscription on the server.
 *
 * Call this from an Enable Notifications button.
 */
export async function subscribeUserToCallPush(): Promise<PushResult> {
  try {
    const currentPermission = getPushPermissionState();

    if (currentPermission === "unsupported") {
      return {
        ok: false,
        error: "Push notifications are not supported in this browser.",
      };
    }

    if (currentPermission === "denied") {
      return {
        ok: false,
        error:
          "Notifications are blocked in your browser settings. Enable them there to receive background call alerts.",
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

    const subscription = await getOrCreatePushSubscription();

    return await persistSubscriptionToServer(subscription);
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
