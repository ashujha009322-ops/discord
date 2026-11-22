"use client";

import React from "react";
import type {
  IncomingCallRequest,
  OutgoingCallState,
} from "@/store/useCallingStore";

interface CallRequestModalProps {
  incomingCall: IncomingCallRequest | null;
  outgoingCall: OutgoingCallState | null;
  callError: string | null;
  onAccept: () => void;
  onDecline: () => void;
  onCancelOutgoing: () => void;
  onDismissError: () => void;
}

export default function CallRequestModal({
  incomingCall,
  outgoingCall,
  callError,
  onAccept,
  onDecline,
  onCancelOutgoing,
  onDismissError,
}: CallRequestModalProps) {
  if (!incomingCall && !outgoingCall && !callError) return null;

  return (
    <div
      role="dialog"
      aria-modal="true"
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4"
    >
      <div className="w-full max-w-sm rounded-xl border bg-white p-6 shadow-xl">
        {incomingCall ? (
          <>
            <h2 className="text-lg font-semibold text-neutral-900">
              Incoming {incomingCall.mode === "video" ? "Video" : "Voice"} Call
            </h2>
            <p className="mt-2 text-sm text-neutral-600">
              <span className="font-medium text-neutral-900">
                {incomingCall.fromDisplayName || incomingCall.fromUsername}
              </span>{" "}
              (@{incomingCall.fromUsername}) is calling you.
            </p>
            <div className="mt-6 flex justify-end gap-3">
              <button
                type="button"
                onClick={onDecline}
                className="rounded-lg border border-red-300 px-4 py-2 text-sm font-medium text-red-700 hover:bg-red-50"
              >
                Decline
              </button>
              <button
                type="button"
                onClick={onAccept}
                className="rounded-lg bg-emerald-600 px-4 py-2 text-sm font-medium text-white hover:bg-emerald-700"
              >
                Accept
              </button>
            </div>
          </>
        ) : outgoingCall && outgoingCall.status === "ringing" ? (
          <>
            <h2 className="text-lg font-semibold text-neutral-900">
              Calling {outgoingCall.targetLabel}...
            </h2>
            <p className="mt-2 text-sm text-neutral-600">
              Waiting for {outgoingCall.targetLabel} to answer your{" "}
              {outgoingCall.mode === "video" ? "video" : "voice"} call.
            </p>
            <div className="mt-6 flex justify-end">
              <button
                type="button"
                onClick={onCancelOutgoing}
                className="rounded-lg border px-4 py-2 text-sm font-medium hover:bg-neutral-100"
              >
                Cancel Call
              </button>
            </div>
          </>
        ) : (
          <>
            <h2 className="text-lg font-semibold text-neutral-900">
              Call Notice
            </h2>
            <p className="mt-2 text-sm text-neutral-600">
              {callError || "Call request ended."}
            </p>
            <div className="mt-6 flex justify-end">
              <button
                type="button"
                onClick={() => {
                  onCancelOutgoing();
                  onDismissError();
                }}
                className="rounded-lg bg-neutral-900 px-4 py-2 text-sm font-medium text-white hover:bg-neutral-800"
              >
                Close
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
