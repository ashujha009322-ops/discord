"use client";

import { useCallback, useEffect, useState } from "react";

import { getOrCreateInvite } from "../invite/actions/invite.action";
import type { InviteDTO, InviteErrorCode } from "./types";

type InviteLinkErrorCode = InviteErrorCode | "NETWORK";

export type InviteLinkState =
  | { status: "loading" }
  | { status: "ready"; invite: InviteDTO; receivedAt: number }
  | {
      status: "error";
      code: InviteLinkErrorCode;
      message: string;
      retryable: boolean;
    };

/** Errors where trying again can plausibly succeed. The rest need a different action. */
const RETRYABLE: ReadonlySet<InviteLinkErrorCode> =
  new Set<InviteLinkErrorCode>([
    "USER_NOT_FOUND",
    "RATE_LIMITED",
    "INTERNAL",
    "NETWORK",
  ]);

const NETWORK_MESSAGE =
  "Could not reach the server. Check your connection and try again.";

/**
 * Fetches (or creates) the invite for a guild when the component mounts.
 *
 * Mount this inside the dialog content: dialog content unmounts on close, so every
 * open starts from a fresh "loading" state and can never flash a previous guild's link.
 *
 * Out-of-order responses are ignored via the `cancelled` flag.
 */
export function useInviteLink(params: {
  guildId: string;
  channelId?: string | null;
}) {
  const { guildId, channelId } = params;
  const [state, setState] = useState<InviteLinkState>({ status: "loading" });
  const [attempt, setAttempt] = useState(0);

  useEffect(() => {
    let cancelled = false;

    void (async () => {
      try {
        const result = await getOrCreateInvite({
          guildId,
          channelId: channelId ?? null,
        });
        if (cancelled) return;

        if (result.ok) {
          setState({
            status: "ready",
            invite: result.data,
            receivedAt: Date.now(),
          });
          return;
        }
        setState({
          status: "error",
          code: result.error.code,
          message: result.error.message,
          retryable: RETRYABLE.has(result.error.code),
        });
      } catch (error) {
        // The action itself never throws; this covers network loss and deploy-time
        // "server action not found" failures.
        if (cancelled) return;
        console.error("[invites] getOrCreateInvite request failed", error);
        setState({
          status: "error",
          code: "NETWORK",
          message: NETWORK_MESSAGE,
          retryable: true,
        });
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [guildId, channelId, attempt]);

  const retry = useCallback(() => {
    setState({ status: "loading" });
    setAttempt((n) => n + 1);
  }, []);

  return { state, retry };
}
