/* eslint-disable react-hooks/set-state-in-effect */
"use client";

import React, { useEffect, useRef, useState } from "react";
import type { ActiveCallSession, CallMode } from "@/store/useCallingStore";

interface ActiveCallRoomProps {
  activeCall: ActiveCallSession;
  localStream: MediaStream | null;
  remoteStream: MediaStream | null;
  isMuted: boolean;
  isCameraOff: boolean;
  onToggleMute: () => void;
  onToggleCamera: () => void;
  onHangUp: () => void;
}

function formatDuration(seconds: number): string {
  const mins = Math.floor(seconds / 60);
  const secs = seconds % 60;
  return `${String(mins).padStart(2, "0")}:${String(secs).padStart(2, "0")}`;
}

export default function ActiveCallRoom({
  activeCall,
  localStream,
  remoteStream,
  isMuted,
  isCameraOff,
  onToggleMute,
  onToggleCamera,
  onHangUp,
}: ActiveCallRoomProps) {
  const localVideoRef = useRef<HTMLVideoElement | null>(null);
  const remoteVideoRef = useRef<HTMLVideoElement | null>(null);
  const remoteAudioRef = useRef<HTMLAudioElement | null>(null);
  const [elapsedSeconds, setElapsedSeconds] = useState<number>(0);

  useEffect(() => {
    if (localVideoRef.current) {
      localVideoRef.current.srcObject = localStream ?? null;
    }
  }, [localStream]);

  useEffect(() => {
    if (remoteVideoRef.current) {
      remoteVideoRef.current.srcObject = remoteStream ?? null;
    }
    if (remoteAudioRef.current) {
      remoteAudioRef.current.srcObject = remoteStream ?? null;
    }
  }, [remoteStream]);

  useEffect(() => {
    if (activeCall.status !== "connected") {
      setElapsedSeconds(0);
      return;
    }
    const timer = setInterval(() => {
      setElapsedSeconds((prev) => prev + 1);
    }, 1000);
    return () => clearInterval(timer);
  }, [activeCall.status]);

  const modeLabel: Record<CallMode, string> = {
    audio: "Voice Call",
    video: "Video Call",
  };

  return (
    <section
      aria-label="Active call room"
      className="fixed inset-0 z-50 flex flex-col justify-between bg-neutral-950 p-6 text-white"
    >
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <p className="text-xs uppercase tracking-wider text-neutral-400">
            {modeLabel[activeCall.mode]} · Peer-to-Peer
          </p>
          <h2 className="mt-1 text-xl font-semibold">
            {activeCall.remoteLabel}
          </h2>
        </div>
        <div className="rounded-full bg-neutral-800 px-3 py-1 text-sm text-neutral-200">
          {activeCall.status === "connected"
            ? formatDuration(elapsedSeconds)
            : "Connecting media..."}
        </div>
      </div>

      {/* Media Stage */}
      <div className="relative my-6 flex flex-1 items-center justify-center overflow-hidden rounded-2xl border border-neutral-800 bg-neutral-900">
        {/* Audio element always attached for both voice and video calls */}
        <audio ref={remoteAudioRef} autoPlay playsInline />

        {activeCall.mode === "video" ? (
          <>
            <video
              ref={remoteVideoRef}
              autoPlay
              playsInline
              className="h-full w-full object-cover"
            />
            {!remoteStream && (
              <div className="absolute inset-0 flex items-center justify-center bg-neutral-900/80 text-sm text-neutral-300">
                Waiting for {activeCall.remoteLabel}&apos;s video stream...
              </div>
            )}

            {/* Local Self-View PiP */}
            <div className="absolute bottom-4 right-4 h-36 w-48 overflow-hidden rounded-xl border border-neutral-700 bg-neutral-950 shadow-lg">
              {!isCameraOff && localStream ? (
                <video
                  ref={localVideoRef}
                  autoPlay
                  playsInline
                  muted
                  className="h-full w-full object-cover"
                />
              ) : (
                <div className="flex h-full w-full items-center justify-center text-xs text-neutral-400">
                  Camera Off
                </div>
              )}
            </div>
          </>
        ) : (
          <div className="flex flex-col items-center gap-3 text-center">
            <div className="flex h-24 w-24 items-center justify-center rounded-full bg-neutral-800 text-2xl font-semibold text-neutral-100">
              {activeCall.remoteLabel.slice(0, 1).toUpperCase()}
            </div>
            <div className="text-lg font-medium">{activeCall.remoteLabel}</div>
            <div className="text-sm text-neutral-400">
              {activeCall.status === "connected"
                ? isMuted
                  ? "Your microphone is muted"
                  : "Connected — voice active"
                : "Establishing direct peer connection..."}
            </div>
          </div>
        )}
      </div>

      {/* Controls */}
      <div className="flex items-center justify-center gap-4">
        <button
          type="button"
          onClick={onToggleMute}
          className={`rounded-full px-5 py-3 text-sm font-medium transition ${
            isMuted
              ? "bg-amber-500 text-neutral-950 hover:bg-amber-400"
              : "bg-neutral-800 text-white hover:bg-neutral-700"
          }`}
        >
          {isMuted ? "Unmute Mic" : "Mute Mic"}
        </button>

        {activeCall.mode === "video" && (
          <button
            type="button"
            onClick={onToggleCamera}
            className={`rounded-full px-5 py-3 text-sm font-medium transition ${
              isCameraOff
                ? "bg-amber-500 text-neutral-950 hover:bg-amber-400"
                : "bg-neutral-800 text-white hover:bg-neutral-700"
            }`}
          >
            {isCameraOff ? "Turn Camera On" : "Turn Camera Off"}
          </button>
        )}

        <button
          type="button"
          onClick={onHangUp}
          className="rounded-full bg-red-600 px-6 py-3 text-sm font-medium text-white hover:bg-red-500"
        >
          Hang Up
        </button>
      </div>
    </section>
  );
}
