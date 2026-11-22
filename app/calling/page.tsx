/* eslint-disable react-hooks/set-state-in-effect */
"use client";

import React, { useCallback, useEffect, useMemo, useState } from "react";
import type { DirectoryUser } from "@/lib/calling-users";
import { useOnlineUsers } from "@/hooks/useOnlineUsers";
import { useCallSignaling } from "@/hooks/useCallSignaling";
import CallRequestModal from "@/components/CallRequestModal";
import ActiveCallRoom from "@/components/ActiveCallRoom";

export default function CallingPage() {
  const [currentUser, setCurrentUser] = useState<DirectoryUser | null>(null);
  const [allUsers, setAllUsers] = useState<DirectoryUser[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const loadDirectory = useCallback(async () => {
    setLoading(true);
    setErrorMsg(null);

    try {
      const res = await fetch("/api/calling/users", { cache: "no-store" });
      const data = await res.json().catch(() => ({}));

      if (!res.ok) {
        setErrorMsg(
          typeof data?.error === "string"
            ? data.error
            : `Request failed with status ${res.status}.`,
        );
        setLoading(false);
        return;
      }

      setCurrentUser(data.currentUser);
      setAllUsers(Array.isArray(data.users) ? data.users : []);
    } catch (err) {
      console.error("[CallingPage loadDirectory]", err);
      setErrorMsg("Network error while loading users. Check your connection.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadDirectory();
  }, [loadDirectory]);

  const { onlineUserIds, presenceError } = useOnlineUsers(
    currentUser?.id ?? null,
  );

  const {
    peerStatus,
    peerError,
    outgoingCall,
    incomingCall,
    callError,
    activeCall,
    localStream,
    remoteStream,
    isMuted,
    isCameraOff,
    requestCall,
    cancelOutgoingCall,
    acceptIncomingCall,
    declineIncomingCall,
    hangUpCall,
    toggleMute,
    toggleCamera,
    clearSignalingState,
  } = useCallSignaling({ currentUser, onlineUserIds });

  const onlineUsers = useMemo(
    () => allUsers.filter((u) => onlineUserIds.has(u.id)),
    [allUsers, onlineUserIds],
  );

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
          onClick={() => void loadDirectory()}
          disabled={loading}
          className="rounded-md border px-3 py-1.5 text-sm disabled:opacity-50"
        >
          {loading ? "Refreshing..." : "Refresh"}
        </button>
      </div>

      {(presenceError || peerError) && (
        <div
          role="alert"
          className="mb-4 rounded-md border border-amber-400 bg-amber-50 p-3 text-sm text-amber-900"
        >
          {presenceError || peerError}
        </div>
      )}

      {errorMsg ? (
        <div
          role="alert"
          className="rounded-lg border border-red-300 bg-red-50 p-4 text-sm text-red-800"
        >
          <p className="mb-3 font-medium">{errorMsg}</p>
          <button
            type="button"
            onClick={() => void loadDirectory()}
            className="rounded bg-red-700 px-3 py-1.5 text-white hover:bg-red-800"
          >
            Retry
          </button>
        </div>
      ) : loading ? (
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

      <CallRequestModal
        incomingCall={incomingCall}
        outgoingCall={outgoingCall}
        callError={callError}
        onAccept={() => void acceptIncomingCall()}
        onDecline={() => void declineIncomingCall()}
        onCancelOutgoing={() => void cancelOutgoingCall()}
        onDismissError={clearSignalingState}
      />

      {activeCall && (
        <ActiveCallRoom
          activeCall={activeCall}
          localStream={localStream}
          remoteStream={remoteStream}
          isMuted={isMuted}
          isCameraOff={isCameraOff}
          onToggleMute={toggleMute}
          onToggleCamera={toggleCamera}
          onHangUp={() => void hangUpCall()}
        />
      )}
    </main>
  );
}
