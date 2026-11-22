"use client";

import React, { useEffect, useMemo, useState } from "react";
import { useCalling } from "@/components/CallingProvider";
import {
  getPushPermissionState,
  subscribeUserToCallPush,
  syncExistingPushSubscription,
} from "@/lib/push-client";

type PushUIStatus =
  | "checking"
  | "inactive"
  | "enabling"
  | "enabled"
  | "denied"
  | "error";

export default function CallingPage() {
  const [pushUIStatus, setPushUIStatus] = useState<PushUIStatus>("checking");

  const [pushError, setPushError] = useState<string | null>(null);

  const [isEnablingPush, setIsEnablingPush] = useState(false);

  const {
    allUsers,
    onlineUserIds,
    directoryLoading,
    directoryError,
    presenceError,
    peerStatus,
    peerError,
    outgoingCall,
    incomingCall,
    activeCall,
    refreshDirectory,
    requestCall,
  } = useCalling();

  const onlineUsers = useMemo(
    () => allUsers.filter((u) => onlineUserIds.has(u.id)),
    [allUsers, onlineUserIds],
  );

  /**
   * Quietly check and sync existing push subscription.
   * Never requests notification permission.
   */
  useEffect(() => {
    let cancelled = false;

    async function checkPushStatus() {
      const permission = getPushPermissionState();

      if (permission === "unsupported") {
        if (!cancelled) {
          setPushUIStatus("inactive");
          setPushError("Push notifications are not supported in this browser.");
        }
        return;
      }

      if (permission === "denied") {
        if (!cancelled) {
          setPushUIStatus("denied");
        }
        return;
      }

      if (permission !== "granted") {
        if (!cancelled) {
          setPushUIStatus("inactive");
        }
        return;
      }

      const result = await syncExistingPushSubscription();

      if (cancelled) return;

      if (result.synced) {
        setPushUIStatus("enabled");
        setPushError(null);
      } else {
        setPushUIStatus("inactive");
        setPushError(result.error || null);
      }
    }

    void checkPushStatus();

    return () => {
      cancelled = true;
    };
  }, []);

  /**
   * Explicit user action to enable call alerts.
   */
  const handleEnablePush = async () => {
    if (isEnablingPush) return;

    setIsEnablingPush(true);
    setPushUIStatus("enabling");
    setPushError(null);

    try {
      const result = await subscribeUserToCallPush();

      if (result.ok) {
        setPushUIStatus("enabled");
        setPushError(null);
      } else {
        const permission = getPushPermissionState();

        setPushUIStatus(permission === "denied" ? "denied" : "inactive");

        setPushError(result.error || "Could not enable call alerts.");
      }
    } catch (err: unknown) {
      console.error("[CallingPage enable push]", err);

      setPushUIStatus("error");
      setPushError(
        err instanceof Error
          ? err.message
          : "Something went wrong while enabling call alerts.",
      );
    } finally {
      setIsEnablingPush(false);
    }
  };

  return (
    <main className="mx-auto max-w-3xl px-4 py-8">
      <div className="mb-6 flex items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold">Online Users</h1>

          <p className="text-sm text-neutral-500">
            Peer status:{" "}
            <span className="font-medium text-neutral-700">{peerStatus}</span>
          </p>
        </div>

        <button
          type="button"
          onClick={() => void refreshDirectory()}
          disabled={directoryLoading}
          className="rounded-md border px-3 py-1.5 text-sm disabled:opacity-50"
        >
          {directoryLoading ? "Refreshing..." : "Refresh"}
        </button>
      </div>

      {/* Call Alerts */}
      <section
        className="mb-6 rounded-lg border p-4"
        aria-label="Call notification settings"
      >
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="min-w-0 flex-1">
            <h2 className="font-semibold">Background Call Alerts</h2>

            {pushUIStatus === "enabled" ? (
              <p
                role="status"
                aria-live="polite"
                className="mt-1 text-sm text-emerald-700"
              >
                Call alerts are enabled on this device.
              </p>
            ) : pushUIStatus === "denied" ? (
              <p className="mt-1 text-sm text-amber-700">
                Notifications are blocked. Enable them in your browser settings
                to receive background call alerts.
              </p>
            ) : pushUIStatus === "checking" ? (
              <p className="mt-1 text-sm text-neutral-500">
                Checking call alert settings...
              </p>
            ) : pushUIStatus === "enabling" ? (
              <p className="mt-1 text-sm text-neutral-500">
                Enabling call alerts...
              </p>
            ) : (
              <p className="mt-1 text-sm text-neutral-500">
                Enable call alerts to receive incoming call notifications when
                this page is in the background.
              </p>
            )}

            {pushError && pushUIStatus !== "denied" && (
              <p role="status" className="mt-1 text-xs text-amber-700">
                {pushError}
              </p>
            )}
          </div>

          {pushUIStatus !== "enabled" && (
            <button
              type="button"
              onClick={() => void handleEnablePush()}
              disabled={
                isEnablingPush ||
                pushUIStatus === "checking" ||
                pushUIStatus === "denied" ||
                getPushPermissionState() === "unsupported"
              }
              className="shrink-0 rounded-md bg-neutral-900 px-4 py-2 text-sm font-medium text-white hover:bg-neutral-800 disabled:cursor-not-allowed disabled:opacity-50"
            >
              {isEnablingPush ? "Enabling..." : "Enable Call Alerts"}
            </button>
          )}
        </div>
      </section>

      {(presenceError || peerError) && (
        <div
          role="alert"
          className="mb-4 rounded-md border border-amber-400 bg-amber-50 p-3 text-sm text-amber-900"
        >
          {presenceError || peerError}
        </div>
      )}

      {directoryError ? (
        <div
          role="alert"
          className="rounded-lg border border-red-300 bg-red-50 p-4 text-sm text-red-800"
        >
          <p className="mb-3 font-medium">{directoryError}</p>

          <button
            type="button"
            onClick={() => void refreshDirectory()}
            className="rounded bg-red-700 px-3 py-1.5 text-white hover:bg-red-800"
          >
            Retry
          </button>
        </div>
      ) : directoryLoading ? (
        <p className="text-sm text-neutral-500">Loading online users...</p>
      ) : onlineUsers.length === 0 ? (
        <div className="rounded-lg border border-dashed p-8 text-center text-sm text-neutral-500">
          No other users are online right now.
        </div>
      ) : (
        <ul className="divide-y rounded-lg border">
          {onlineUsers.map((user) => {
            const label = user.displayName || user.username;

            const disabled =
              peerStatus !== "ready" ||
              Boolean(outgoingCall || incomingCall || activeCall);

            return (
              <li
                key={user.id}
                className="flex items-center justify-between gap-4 p-4"
              >
                <div className="flex items-center gap-3">
                  <span
                    aria-label="Online"
                    className="h-2.5 w-2.5 rounded-full bg-emerald-500"
                  />

                  <div>
                    <div className="font-medium">{label}</div>

                    <div className="text-xs text-neutral-500">
                      @{user.username}
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    disabled={disabled}
                    onClick={() => void requestCall(user, "audio")}
                    className="rounded-md border px-3 py-1.5 text-sm font-medium hover:bg-neutral-100 disabled:opacity-50"
                  >
                    Voice Call
                  </button>

                  <button
                    type="button"
                    disabled={disabled}
                    onClick={() => void requestCall(user, "video")}
                    className="rounded-md bg-neutral-900 px-3 py-1.5 text-sm font-medium text-white hover:bg-neutral-800 disabled:opacity-50"
                  >
                    Video Call
                  </button>
                </div>
              </li>
            );
          })}
        </ul>
      )}
    </main>
  );
}
