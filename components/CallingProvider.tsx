/* eslint-disable react-hooks/set-state-in-effect */
"use client";

import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import type { RealtimeChannel } from "@supabase/supabase-js";
import type { MediaConnection } from "peerjs";
import type { DirectoryUser } from "@/lib/calling-users";
import { getBrowserSupabaseClient } from "@/lib/supabase-browser";
import {
  startIncomingCallRingtone,
  stopIncomingCallRingtone,
  triggerBackgroundCallNotification,
} from "@/lib/call-alerts";
import {
  useCallingStore,
  type ActiveCallSession,
  type CallMode,
  type IncomingCallRequest,
  type OutgoingCallState,
} from "@/store/useCallingStore";
import CallRequestModal from "@/components/CallRequestModal";
import ActiveCallRoom from "@/components/ActiveCallRoom";
import { syncExistingPushSubscription } from "@/lib/push-client";

const RING_TIMEOUT_MS = 30_000;

interface CallRequestBroadcastPayload {
  callId?: string;
  fromUserId?: string;
  fromUsername?: string;
  fromDisplayName?: string | null;
  fromPeerId?: string;
  mode?: CallMode;
}

interface CallAcceptedPayload {
  callId?: string;
  responderPeerId?: string;
}

interface CallDeclinedPayload {
  callId?: string;
  reason?: string;
}

interface CallCancelledPayload {
  callId?: string;
}

interface CallEndedPayload {
  callId?: string;
}

interface CallingContextValue {
  currentUser: DirectoryUser | null;
  allUsers: DirectoryUser[];
  onlineUserIds: Set<string>;
  directoryLoading: boolean;
  directoryError: string | null;
  presenceError: string | null;
  peerStatus: "idle" | "connecting" | "ready" | "error";
  peerError: string | null;
  outgoingCall: OutgoingCallState | null;
  incomingCall: IncomingCallRequest | null;
  activeCall: ActiveCallSession | null;
  callError: string | null;
  refreshDirectory: () => Promise<void>;
  requestCall: (targetUser: DirectoryUser, mode: CallMode) => Promise<void>;
  cancelOutgoingCall: () => Promise<void>;
  acceptIncomingCall: () => Promise<void>;
  declineIncomingCall: () => Promise<void>;
  hangUpCall: () => Promise<void>;
  clearSignalingState: () => void;
}

const CallingContext = createContext<CallingContextValue | null>(null);

function getFriendlyMediaError(err: unknown, mode: CallMode): string {
  if (err instanceof DOMException) {
    if (
      err.name === "NotAllowedError" ||
      err.name === "PermissionDeniedError"
    ) {
      return mode === "video"
        ? "Camera or microphone permission was denied in your browser."
        : "Microphone permission was denied in your browser.";
    }
    if (err.name === "NotFoundError" || err.name === "DevicesNotFoundError") {
      return mode === "video"
        ? "No camera or microphone device was found on your device."
        : "No microphone device was found on your device.";
    }
    if (err.name === "NotReadableError" || err.name === "TrackStartError") {
      return "Your camera or microphone is already in use by another app or tab.";
    }
  }
  return "Could not access your microphone/camera for the call.";
}

async function acquireLocalMedia(mode: CallMode): Promise<MediaStream> {
  if (
    typeof navigator === "undefined" ||
    !navigator.mediaDevices ||
    typeof navigator.mediaDevices.getUserMedia !== "function"
  ) {
    throw new Error(
      "Media devices are unavailable in this browser context (HTTPS is required).",
    );
  }

  return navigator.mediaDevices.getUserMedia({
    audio: true,
    video: mode === "video" ? { facingMode: "user" } : false,
  });
}

export function CallingProvider({ children }: { children: React.ReactNode }) {
  const [currentUser, setCurrentUser] = useState<DirectoryUser | null>(null);
  const [allUsers, setAllUsers] = useState<DirectoryUser[]>([]);
  const [directoryLoading, setDirectoryLoading] = useState<boolean>(true);
  const [directoryError, setDirectoryError] = useState<string | null>(null);
  const [onlineUserIds, setOnlineUserIds] = useState<Set<string>>(new Set());
  const [presenceError, setPresenceError] = useState<string | null>(null);

  const {
    peerId,
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
    setPeerInstance,
    setOutgoingCall,
    updateOutgoingStatus,
    setIncomingCall,
    setCallError,
    clearSignalingState,
    startActiveCallSession,
    setActiveMediaCall,
    setRemoteStream,
    toggleMute,
    toggleCamera,
    teardownActiveCall,
  } = useCallingStore();

  const myChannelRef = useRef<RealtimeChannel | null>(null);
  const ringTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const pendingAnswerStreamRef = useRef<MediaStream | null>(null);

  const clearRingTimer = useCallback(() => {
    if (ringTimerRef.current) {
      clearTimeout(ringTimerRef.current);
      ringTimerRef.current = null;
    }
  }, []);

  const refreshDirectory = useCallback(async () => {
    setDirectoryLoading(true);
    setDirectoryError(null);

    try {
      const res = await fetch("/api/calling/users", { cache: "no-store" });
      const data = await res.json().catch(() => ({}));

      if (!res.ok) {
        setDirectoryError(
          typeof data?.error === "string"
            ? data.error
            : `Request failed with status ${res.status}.`,
        );
        return;
      }

      setCurrentUser(data.currentUser ?? null);
      setAllUsers(Array.isArray(data.users) ? data.users : []);
    } catch (err) {
      console.error("[CallingProvider refreshDirectory]", err);
      setDirectoryError("Network error while loading users.");
    } finally {
      setDirectoryLoading(false);
    }
  }, []);

  useEffect(() => {
    void refreshDirectory();
  }, [refreshDirectory]);

  // Register service worker after browser mount
  useEffect(() => {
    if (!currentUser?.id) return;
    if (typeof window === "undefined" || !("serviceWorker" in navigator))
      return;

    let cancelled = false;

    void navigator.serviceWorker
      .register("/sw.js", { scope: "/" })
      .then(() => {
        if (cancelled) return;
        return syncExistingPushSubscription();
      })
      .catch((err) => {
        console.error("[SW + push auto-sync]", err);
      });

    return () => {
      cancelled = true;
    };
  }, [currentUser?.id]);

  // Stop ringtone whenever incomingCall clears
  useEffect(() => {
    if (!incomingCall) {
      stopIncomingCallRingtone();
    }
  }, [incomingCall]);

  const attachMediaCallListeners = useCallback(
    (mediaCall: MediaConnection, expectedCallId: string) => {
      setActiveMediaCall(mediaCall);

      mediaCall.on("stream", (incomingRemoteStream) => {
        const current = useCallingStore.getState().activeCall;
        if (current && current.callId === expectedCallId) {
          setRemoteStream(incomingRemoteStream);
        }
      });

      mediaCall.on("close", () => {
        const current = useCallingStore.getState().activeCall;
        if (current && current.callId === expectedCallId) {
          teardownActiveCall();
        }
      });

      mediaCall.on("error", (err) => {
        console.error("[PeerJS MediaConnection error]", err);
        const current = useCallingStore.getState().activeCall;
        if (current && current.callId === expectedCallId) {
          teardownActiveCall();
          setCallError("Peer media connection failed during the call.");
        }
      });
    },
    [setActiveMediaCall, setRemoteStream, teardownActiveCall, setCallError],
  );

  // 1. Global online presence via shared Supabase client
  useEffect(() => {
    if (!currentUser?.id) return;

    let supabase;
    try {
      supabase = getBrowserSupabaseClient();
    } catch (err) {
      setPresenceError(
        err instanceof Error ? err.message : "Supabase configuration error.",
      );
      return;
    }

    const presenceChannel = supabase.channel("calling-presence", {
      config: { presence: { key: currentUser.id } },
    });

    presenceChannel.on("presence", { event: "sync" }, () => {
      try {
        const state = presenceChannel.presenceState();
        const ids = new Set<string>(Object.keys(state));
        ids.delete(currentUser.id);
        setOnlineUserIds(ids);
        setPresenceError(null);
      } catch (err) {
        console.error("[Presence sync error]", err);
        setPresenceError("Unable to sync online status.");
      }
    });

    presenceChannel.subscribe(async (status) => {
      if (status === "SUBSCRIBED") {
        try {
          await presenceChannel.track({ onlineAt: Date.now() });
        } catch (err) {
          console.error("[Presence track error]", err);
          setPresenceError("Could not publish your online status.");
        }
      } else if (status === "CHANNEL_ERROR" || status === "TIMED_OUT") {
        setPresenceError("Live presence connection interrupted.");
      }
    });

    return () => {
      void supabase.removeChannel(presenceChannel);
    };
  }, [currentUser?.id]);

  // 2. Global ephemeral PeerJS instance
  useEffect(() => {
    if (!currentUser?.id) return;

    let cancelled = false;
    setPeerInstance(null, null, "connecting", null);

    async function setupPeer() {
      try {
        const { default: PeerClass } = await import("peerjs");
        if (cancelled) return;

        const instance = new PeerClass({
          config: {
            iceServers: [{ urls: "stun:stun.l.google.com:19302" }],
          },
        });

        instance.on("open", (generatedId) => {
          if (cancelled) return;
          setPeerInstance(instance, generatedId, "ready", null);
        });

        instance.on("call", (incomingMediaCall) => {
          if (cancelled) {
            incomingMediaCall.close();
            return;
          }

          const state = useCallingStore.getState();
          const answerStream = pendingAnswerStreamRef.current;

          if (!state.activeCall || !answerStream) {
            incomingMediaCall.close();
            return;
          }

          try {
            incomingMediaCall.answer(answerStream);
            pendingAnswerStreamRef.current = null;
            attachMediaCallListeners(
              incomingMediaCall,
              state.activeCall.callId,
            );
          } catch (err) {
            console.error("[PeerJS answer failed]", err);
            teardownActiveCall();
            setCallError("Failed to answer incoming peer media stream.");
          }
        });

        instance.on("disconnected", () => {
          if (cancelled) return;
          setPeerInstance(
            instance,
            null,
            "error",
            "Disconnected from signaling server. Reconnecting...",
          );
          try {
            instance.reconnect();
          } catch (err) {
            console.error("[PeerJS reconnect failed]", err);
          }
        });

        instance.on("error", (err) => {
          if (cancelled) return;
          console.error("[PeerJS error]", err);
          setPeerInstance(
            instance,
            null,
            "error",
            err?.message || "Peer connection error occurred.",
          );
        });
      } catch (err) {
        if (cancelled) return;
        console.error("[PeerJS init failed]", err);
        setPeerInstance(
          null,
          null,
          "error",
          "Could not initialize PeerJS in this browser.",
        );
      }
    }

    void setupPeer();

    return () => {
      cancelled = true;
      clearRingTimer();
      stopIncomingCallRingtone();
      pendingAnswerStreamRef.current = null;
      useCallingStore.getState().teardownActiveCall();
      const currentPeer = useCallingStore.getState().peer;
      if (currentPeer) {
        try {
          currentPeer.destroy();
        } catch (err) {
          console.error("[PeerJS destroy error]", err);
        }
      }
      setPeerInstance(null, null, "idle", null);
    };
  }, [
    currentUser?.id,
    setPeerInstance,
    clearRingTimer,
    attachMediaCallListeners,
    teardownActiveCall,
    setCallError,
  ]);

  // 3. Global personal Supabase Realtime broadcast signaling channel
  useEffect(() => {
    if (!currentUser?.id) return;

    let supabase;
    try {
      supabase = getBrowserSupabaseClient();
    } catch (err) {
      setCallError(
        err instanceof Error ? err.message : "Missing Supabase config.",
      );
      return;
    }

    const channel = supabase.channel(`calls:user:${currentUser.id}`, {
      config: { broadcast: { ack: true } },
    });

    channel.on<CallRequestBroadcastPayload>(
      "broadcast",
      { event: "call-request" },
      ({ payload }) => {
        if (
          !payload?.callId ||
          !payload?.fromUserId ||
          !payload?.fromUsername ||
          !payload?.fromPeerId ||
          !payload?.mode
        ) {
          return;
        }

        const state = useCallingStore.getState();
        if (state.outgoingCall || state.incomingCall || state.activeCall) {
          const busyChannel = supabase.channel(
            `calls:user:${payload.fromUserId}`,
          );
          busyChannel.subscribe((status) => {
            if (status === "SUBSCRIBED") {
              void busyChannel.send({
                type: "broadcast",
                event: "call-declined",
                payload: { callId: payload.callId, reason: "busy" },
              });
              setTimeout(() => void supabase.removeChannel(busyChannel), 1000);
            }
          });
          return;
        }

        const callerName = payload.fromDisplayName || payload.fromUsername;
        const incoming: IncomingCallRequest = {
          callId: payload.callId,
          fromUserId: payload.fromUserId,
          fromUsername: payload.fromUsername,
          fromDisplayName: payload.fromDisplayName ?? null,
          fromPeerId: payload.fromPeerId,
          mode: payload.mode,
          receivedAt: Date.now(),
        };

        setIncomingCall(incoming);
        startIncomingCallRingtone({
          src: "/ring/default.mp3",
          volume: 0.7,
          repeatDelayMs: 1200,
        });
        void triggerBackgroundCallNotification({
          callerName,
          mode: payload.mode,
          onFocusCall: () => {
            setIncomingCall(incoming);
          },
        });
      },
    );

    channel.on<CallAcceptedPayload>(
      "broadcast",
      { event: "call-accepted" },
      async ({ payload }) => {
        const { callId, responderPeerId } = payload ?? {};
        const state = useCallingStore.getState();
        const currentOut = state.outgoingCall;

        if (!currentOut || currentOut.callId !== callId) return;

        clearRingTimer();
        updateOutgoingStatus("accepted");

        if (!responderPeerId) {
          setOutgoingCall(null);
          setCallError("Callee accepted but did not provide a Peer ID.");
          return;
        }

        const activePeer = state.peer;
        if (!activePeer || state.peerStatus !== "ready") {
          setOutgoingCall(null);
          setCallError("Your peer connection was not ready to start media.");
          return;
        }

        try {
          const stream = await acquireLocalMedia(currentOut.mode);
          startActiveCallSession(
            {
              callId: currentOut.callId,
              remoteUserId: currentOut.targetUserId,
              remoteLabel: currentOut.targetLabel,
              remotePeerId: responderPeerId,
              mode: currentOut.mode,
              role: "caller",
              status: "connecting",
            },
            stream,
          );

          const mediaCall = activePeer.call(responderPeerId, stream, {
            metadata: { callId: currentOut.callId, mode: currentOut.mode },
          });

          if (!mediaCall) {
            teardownActiveCall();
            setCallError("Could not initiate peer media call.");
            return;
          }

          attachMediaCallListeners(mediaCall, currentOut.callId);
        } catch (err) {
          teardownActiveCall();
          setCallError(getFriendlyMediaError(err, currentOut.mode));
        }
      },
    );

    channel.on<CallDeclinedPayload>(
      "broadcast",
      { event: "call-declined" },
      ({ payload }) => {
        const { callId, reason } = payload ?? {};
        const currentOut = useCallingStore.getState().outgoingCall;
        if (!currentOut || currentOut.callId !== callId) return;

        clearRingTimer();
        updateOutgoingStatus("declined");
        setCallError(
          reason === "busy"
            ? `${currentOut.targetLabel} is currently on another call.`
            : `${currentOut.targetLabel} declined the call.`,
        );
      },
    );

    channel.on<CallCancelledPayload>(
      "broadcast",
      { event: "call-cancelled" },
      ({ payload }) => {
        const { callId } = payload ?? {};
        const currentIn = useCallingStore.getState().incomingCall;
        if (currentIn && currentIn.callId === callId) {
          stopIncomingCallRingtone();
          setIncomingCall(null);
          setCallError("Caller cancelled the call.");
        }
      },
    );

    channel.on<CallEndedPayload>(
      "broadcast",
      { event: "call-ended" },
      ({ payload }) => {
        const { callId } = payload ?? {};
        const currentActive = useCallingStore.getState().activeCall;
        if (currentActive && (!callId || currentActive.callId === callId)) {
          pendingAnswerStreamRef.current = null;
          teardownActiveCall();
          setCallError(`${currentActive.remoteLabel} ended the call.`);
        }
      },
    );

    channel.subscribe((status) => {
      if (status === "CHANNEL_ERROR" || status === "TIMED_OUT") {
        setCallError(
          "Call signaling channel error. Please refresh and try again.",
        );
      }
    });

    myChannelRef.current = channel;

    return () => {
      myChannelRef.current = null;
      void supabase.removeChannel(channel);
    };
  }, [
    currentUser?.id,
    clearRingTimer,
    setCallError,
    setIncomingCall,
    setOutgoingCall,
    updateOutgoingStatus,
    startActiveCallSession,
    attachMediaCallListeners,
    teardownActiveCall,
  ]);

  const sendToUserChannel = useCallback(
    async (
      targetUserId: string,
      event:
        | "call-request"
        | "call-accepted"
        | "call-declined"
        | "call-cancelled"
        | "call-ended",
      payload: Record<string, unknown>,
    ) => {
      const supabase = getBrowserSupabaseClient();
      const targetChannel = supabase.channel(`calls:user:${targetUserId}`, {
        config: { broadcast: { ack: true } },
      });

      await new Promise<void>((resolve, reject) => {
        const timeout = setTimeout(() => {
          void supabase.removeChannel(targetChannel);
          reject(new Error("Timed out sending call signal."));
        }, 6000);

        targetChannel.subscribe(async (status) => {
          if (status === "SUBSCRIBED") {
            try {
              const ack = await targetChannel.send({
                type: "broadcast",
                event,
                payload,
              });
              clearTimeout(timeout);
              setTimeout(
                () => void supabase.removeChannel(targetChannel),
                1000,
              );
              if (ack !== "ok") {
                reject(
                  new Error("Signaling server did not acknowledge request."),
                );
              } else {
                resolve();
              }
            } catch (err) {
              clearTimeout(timeout);
              void supabase.removeChannel(targetChannel);
              reject(err);
            }
          } else if (status === "CHANNEL_ERROR" || status === "TIMED_OUT") {
            clearTimeout(timeout);
            void supabase.removeChannel(targetChannel);
            reject(new Error("Failed to reach recipient signaling channel."));
          }
        });
      });
    },
    [],
  );

  const requestCall = useCallback(
    async (targetUser: DirectoryUser, mode: CallMode) => {
      setCallError(null);

      if (!currentUser) {
        setCallError("You must be signed in to place a call.");
        return;
      }
      if (!peerId || peerStatus !== "ready") {
        setCallError(
          "Your peer connection is still connecting. Please wait a second.",
        );
        return;
      }
      if (!onlineUserIds.has(targetUser.id)) {
        setCallError(
          `${targetUser.displayName || targetUser.username} is offline.`,
        );
        return;
      }
      if (outgoingCall || incomingCall || activeCall) {
        setCallError("A call is already in progress.");
        return;
      }

      const callId = crypto.randomUUID();
      const label = targetUser.displayName || targetUser.username;

      setOutgoingCall({
        callId,
        targetUserId: targetUser.id,
        targetLabel: label,
        mode,
        status: "ringing",
      });

      clearRingTimer();
      ringTimerRef.current = setTimeout(() => {
        const latest = useCallingStore.getState().outgoingCall;
        if (latest && latest.callId === callId && latest.status === "ringing") {
          updateOutgoingStatus("timeout");
          setCallError(`${label} did not answer in time.`);
          void sendToUserChannel(targetUser.id, "call-cancelled", {
            callId,
          }).catch(() => {});
        }
      }, RING_TIMEOUT_MS);

      try {
        await sendToUserChannel(targetUser.id, "call-request", {
          callId,
          fromUserId: currentUser.id,
          fromUsername: currentUser.username,
          fromDisplayName: currentUser.displayName,
          fromPeerId: peerId,
          mode,
        });
      } catch (err: unknown) {
        clearRingTimer();
        updateOutgoingStatus("error");
        setCallError(
          err instanceof Error ? err.message : "Failed to send call request.",
        );
      }
    },
    [
      currentUser,
      peerId,
      peerStatus,
      onlineUserIds,
      outgoingCall,
      incomingCall,
      activeCall,
      clearRingTimer,
      sendToUserChannel,
      setCallError,
      setOutgoingCall,
      updateOutgoingStatus,
    ],
  );

  const cancelOutgoingCall = useCallback(async () => {
    clearRingTimer();
    const currentOut = useCallingStore.getState().outgoingCall;
    setOutgoingCall(null);
    if (currentOut) {
      try {
        await sendToUserChannel(currentOut.targetUserId, "call-cancelled", {
          callId: currentOut.callId,
        });
      } catch (err) {
        console.error("[cancelOutgoingCall]", err);
      }
    }
  }, [clearRingTimer, sendToUserChannel, setOutgoingCall]);

  const acceptIncomingCall = useCallback(async () => {
    stopIncomingCallRingtone();
    const req = useCallingStore.getState().incomingCall;
    if (!req) return;

    if (!peerId || peerStatus !== "ready") {
      setCallError("Peer connection is not ready yet. Try accepting again.");
      return;
    }

    try {
      const stream = await acquireLocalMedia(req.mode);
      pendingAnswerStreamRef.current = stream;

      startActiveCallSession(
        {
          callId: req.callId,
          remoteUserId: req.fromUserId,
          remoteLabel: req.fromDisplayName || req.fromUsername,
          remotePeerId: req.fromPeerId,
          mode: req.mode,
          role: "callee",
          status: "connecting",
        },
        stream,
      );

      await sendToUserChannel(req.fromUserId, "call-accepted", {
        callId: req.callId,
        responderPeerId: peerId,
      });
    } catch (err: unknown) {
      if (pendingAnswerStreamRef.current) {
        pendingAnswerStreamRef.current.getTracks().forEach((t) => t.stop());
        pendingAnswerStreamRef.current = null;
      }
      teardownActiveCall();
      setCallError(getFriendlyMediaError(err, req.mode));
    }
  }, [
    peerId,
    peerStatus,
    startActiveCallSession,
    sendToUserChannel,
    teardownActiveCall,
    setCallError,
  ]);

  const declineIncomingCall = useCallback(async () => {
    stopIncomingCallRingtone();
    const req = useCallingStore.getState().incomingCall;
    setIncomingCall(null);
    if (!req) return;

    try {
      await sendToUserChannel(req.fromUserId, "call-declined", {
        callId: req.callId,
        reason: "declined",
      });
    } catch (err) {
      console.error("[declineIncomingCall]", err);
    }
  }, [sendToUserChannel, setIncomingCall]);

  // Handle Accept / Decline actions from push notifications.
  useEffect(() => {
    if (typeof window === "undefined") return;

    const url = new URL(window.location.href);
    const params = url.searchParams;

    const pushAction = params.get("pushAction");
    const callId = params.get("callId");
    const fromUserId = params.get("fromUserId");
    const mode = params.get("mode");

    // No notification action to process.
    if (!pushAction) return;

    // Remove notification parameters without reloading the page.
    const clearPushParams = () => {
      [
        "pushAction",
        "callId",
        "fromUserId",
        "fromUsername",
        "fromDisplayName",
        "mode",
      ].forEach((key) => params.delete(key));

      const newUrl = `${url.pathname}${url.search}${url.hash}`;

      window.history.replaceState(window.history.state, "", newUrl);
    };

    // Opening the notification should only open the calling page.
    if (pushAction === "open") {
      clearPushParams();
      return;
    }

    // Only accept or decline valid notification actions.
    if (pushAction !== "accept" && pushAction !== "decline") {
      clearPushParams();
      return;
    }

    if (!callId || !fromUserId) {
      clearPushParams();
      return;
    }

    // Wait for the matching Supabase Realtime call request.
    // Never accept or decline a different incoming call.
    if (
      !currentUser ||
      !incomingCall ||
      incomingCall.callId !== callId ||
      incomingCall.fromUserId !== fromUserId ||
      incomingCall.mode !== (mode === "video" ? "video" : "audio")
    ) {
      return;
    }

    // Clear URL parameters before invoking the action to prevent
    // the effect from processing the same notification twice.
    clearPushParams();

    if (pushAction === "accept") {
      void acceptIncomingCall();
    } else {
      void declineIncomingCall();
    }
  }, [currentUser, incomingCall, acceptIncomingCall, declineIncomingCall]);

  const hangUpCall = useCallback(async () => {
    stopIncomingCallRingtone();
    const currentActive = useCallingStore.getState().activeCall;
    pendingAnswerStreamRef.current = null;
    teardownActiveCall();

    if (currentActive) {
      try {
        await sendToUserChannel(currentActive.remoteUserId, "call-ended", {
          callId: currentActive.callId,
        });
      } catch (err) {
        console.error("[hangUpCall notify error]", err);
      }
    }
  }, [teardownActiveCall, sendToUserChannel]);

  const value = useMemo<CallingContextValue>(
    () => ({
      currentUser,
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
      callError,
      refreshDirectory,
      requestCall,
      cancelOutgoingCall,
      acceptIncomingCall,
      declineIncomingCall,
      hangUpCall,
      clearSignalingState,
    }),
    [
      currentUser,
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
      callError,
      refreshDirectory,
      requestCall,
      cancelOutgoingCall,
      acceptIncomingCall,
      declineIncomingCall,
      hangUpCall,
      clearSignalingState,
    ],
  );

  return (
    <CallingContext.Provider value={value}>
      {children}

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
    </CallingContext.Provider>
  );
}

export function useCalling(): CallingContextValue {
  const ctx = useContext(CallingContext);
  if (!ctx) {
    throw new Error("useCalling must be used within a CallingProvider.");
  }
  return ctx;
}
