"use client";

import { create } from "zustand";
import type Peer from "peerjs";
import type { MediaConnection } from "peerjs";

export type CallMode = "audio" | "video";

export interface OutgoingCallState {
  callId: string;
  targetUserId: string;
  targetLabel: string;
  mode: CallMode;
  status: "ringing" | "accepted" | "declined" | "timeout" | "error";
}

export interface IncomingCallRequest {
  callId: string;
  fromUserId: string;
  fromUsername: string;
  fromDisplayName: string | null;
  fromPeerId: string;
  mode: CallMode;
  receivedAt: number;
}

export interface ActiveCallSession {
  callId: string;
  remoteUserId: string;
  remoteLabel: string;
  remotePeerId: string | null;
  mode: CallMode;
  role: "caller" | "callee";
  status: "connecting" | "connected";
}

function stopMediaStreamTracks(stream: MediaStream | null) {
  if (!stream) return;
  try {
    stream.getTracks().forEach((track) => {
      try {
        track.stop();
      } catch (err) {
        console.error("[stopMediaStreamTracks track.stop error]", err);
      }
    });
  } catch (err) {
    console.error("[stopMediaStreamTracks error]", err);
  }
}

interface CallingStoreState {
  peer: Peer | null;
  peerId: string | null;
  peerStatus: "idle" | "connecting" | "ready" | "error";
  peerError: string | null;

  outgoingCall: OutgoingCallState | null;
  incomingCall: IncomingCallRequest | null;
  callError: string | null;

  activeCall: ActiveCallSession | null;
  activeMediaCall: MediaConnection | null;
  localStream: MediaStream | null;
  remoteStream: MediaStream | null;
  isMuted: boolean;
  isCameraOff: boolean;

  setPeerInstance: (
    peer: Peer | null,
    peerId: string | null,
    status: "idle" | "connecting" | "ready" | "error",
    error?: string | null,
  ) => void;
  setOutgoingCall: (call: OutgoingCallState | null) => void;
  updateOutgoingStatus: (status: OutgoingCallState["status"]) => void;
  setIncomingCall: (req: IncomingCallRequest | null) => void;
  setCallError: (err: string | null) => void;
  clearSignalingState: () => void;

  startActiveCallSession: (
    session: ActiveCallSession,
    localStream: MediaStream,
  ) => void;
  setActiveMediaCall: (mediaCall: MediaConnection | null) => void;
  setRemoteStream: (stream: MediaStream | null) => void;
  setActiveCallStatus: (status: ActiveCallSession["status"]) => void;
  toggleMute: () => void;
  toggleCamera: () => void;
  teardownActiveCall: () => void;
}

export const useCallingStore = create<CallingStoreState>((set, get) => ({
  peer: null,
  peerId: null,
  peerStatus: "idle",
  peerError: null,

  outgoingCall: null,
  incomingCall: null,
  callError: null,

  activeCall: null,
  activeMediaCall: null,
  localStream: null,
  remoteStream: null,
  isMuted: false,
  isCameraOff: false,

  setPeerInstance: (peer, peerId, peerStatus, error = null) =>
    set({ peer, peerId, peerStatus, peerError: error }),

  setOutgoingCall: (outgoingCall) => set({ outgoingCall, callError: null }),

  updateOutgoingStatus: (status) =>
    set((state) => ({
      outgoingCall: state.outgoingCall
        ? { ...state.outgoingCall, status }
        : null,
    })),

  setIncomingCall: (incomingCall) => set({ incomingCall, callError: null }),

  setCallError: (callError) => set({ callError }),

  clearSignalingState: () =>
    set({
      outgoingCall: null,
      incomingCall: null,
      callError: null,
    }),

  startActiveCallSession: (activeCall, localStream) => {
    const hasVideoTrack = localStream.getVideoTracks().length > 0;
    const isCameraOff = activeCall.mode === "video" ? !hasVideoTrack : true;
    set({
      activeCall,
      localStream,
      remoteStream: null,
      outgoingCall: null,
      incomingCall: null,
      callError: null,
      isMuted: false,
      isCameraOff,
    });
  },

  setActiveMediaCall: (activeMediaCall) => set({ activeMediaCall }),

  setRemoteStream: (remoteStream) =>
    set((state) => ({
      remoteStream,
      activeCall: state.activeCall
        ? { ...state.activeCall, status: "connected" }
        : null,
    })),

  setActiveCallStatus: (status) =>
    set((state) => ({
      activeCall: state.activeCall ? { ...state.activeCall, status } : null,
    })),

  toggleMute: () => {
    const { localStream, isMuted } = get();
    const nextMuted = !isMuted;
    localStream?.getAudioTracks().forEach((track) => {
      track.enabled = !nextMuted;
    });
    set({ isMuted: nextMuted });
  },

  toggleCamera: () => {
    const { localStream, isCameraOff } = get();
    const videoTracks = localStream?.getVideoTracks() ?? [];
    if (videoTracks.length === 0) return;

    const nextCameraOff = !isCameraOff;
    videoTracks.forEach((track) => {
      track.enabled = !nextCameraOff;
    });
    set({ isCameraOff: nextCameraOff });
  },

  teardownActiveCall: () => {
    const { activeMediaCall, localStream, remoteStream } = get();

    if (activeMediaCall) {
      try {
        activeMediaCall.close();
      } catch (err) {
        console.error("[teardownActiveCall activeMediaCall.close error]", err);
      }
    }

    stopMediaStreamTracks(localStream);
    stopMediaStreamTracks(remoteStream);

    set({
      activeCall: null,
      activeMediaCall: null,
      localStream: null,
      remoteStream: null,
      outgoingCall: null,
      incomingCall: null,
      isMuted: false,
      isCameraOff: false,
    });
  },
}));
