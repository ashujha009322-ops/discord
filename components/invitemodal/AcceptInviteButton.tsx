"use client";

import { useState } from "react";

import { acceptInvite } from "@/components/invitemodal/acceptInvite";

const NETWORK_MESSAGE =
  "Could not reach the server. Check your connection and try again.";

export function AcceptInviteButton({ code }: { code: string }) {
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleAccept() {
    setPending(true);
    setError(null);
    try {
      const result = await acceptInvite({ code });
      // On success the action redirects, so execution only gets here on failure.
      if (!result.ok) {
        setError(result.error.message);
        setPending(false);
      }
    } catch (err) {
      console.error("[invites] acceptInvite request failed", err);
      setError(NETWORK_MESSAGE);
      setPending(false);
    }
  }

  return (
    <div>
      <button
        type="button"
        onClick={handleAccept}
        disabled={pending}
        className="w-full rounded bg-[#5865f2] px-4 py-3 font-medium text-white transition hover:bg-[#4752c4] disabled:cursor-not-allowed disabled:opacity-60"
      >
        {pending ? "Joining..." : "Accept invite"}
      </button>
      {error && (
        <p role="alert" className="mt-3 text-sm text-[#f23f43]">
          {error}
        </p>
      )}
    </div>
  );
}
