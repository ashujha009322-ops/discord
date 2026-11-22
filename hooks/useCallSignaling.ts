"use client";

import { useCallback, useEffect, useRef } from "react";
import {
  createClient,
  type RealtimeChannel,
  type SupabaseClient,
} from "@supabase/supabase-js";
import type { MediaConnection } from "peerjs";
import type { DirectoryUser } from "@/lib/calling-users";
import {
  useCallingStore,
  type CallMode,
  type IncomingCallRequest,
} from "@/store/useCallingStore";

const RING_TIMEOUT_MS = 30_000;

interface UseCallSignalingParams {
  currentUser: DirectoryUser | null;
  onlineUserIds: Set<string>;
}

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

export function useCallSignaling({
  currentUser,
  onlineUserIds,
}: UseCallSignalingParams) {
  const {
    peer,
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

  const supabaseRef = useRef<SupabaseClient | null>(null);
  const myChannelRef = useRef<RealtimeChannel | null>(null);
  const ringTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const pendingAnswerStreamRef = useRef<MediaStream | null>(null);

  const clearRingTimer = useCallback(() => {
    if (ringTimerRef.current) {
      clearTimeout(ringTimerRef.current);
      ringTimerRef.current = null;
    }
  }, []);

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
      const supabase = supabaseRef.current;
      if (!supabase) {
        throw new Error("Signaling client is not initialized.");
      }

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

  // 1. Initialize ephemeral PeerJS instance in memory only + handle incoming PeerJS media calls
  useEffect(() => {
    if (!currentUser) return;

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
            "Disconnected from signaling server. Attempting reconnect...",
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
    currentUser,
    setPeerInstance,
    clearRingTimer,
    attachMediaCallListeners,
    teardownActiveCall,
    setCallError,
  ]);

  // 2. Subscribe to personal Supabase Realtime signaling channel
  useEffect(() => {
    if (!currentUser) return;

    const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

    if (!url || !key) {
      setCallError(
        "Missing Supabase environment variables for call signaling.",
      );
      return;
    }

    const supabase: SupabaseClient = createClient(url, key);
    supabaseRef.current = supabase;

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
    currentUser,
    clearRingTimer,
    setCallError,
    setIncomingCall,
    setOutgoingCall,
    updateOutgoingStatus,
    startActiveCallSession,
    attachMediaCallListeners,
    teardownActiveCall,
  ]);

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

  const hangUpCall = useCallback(async () => {
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

  return {
    peer,
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
    requestCall,
    cancelOutgoingCall,
    acceptIncomingCall,
    declineIncomingCall,
    hangUpCall,
    toggleMute,
    toggleCamera,
    clearSignalingState,
  };
}
