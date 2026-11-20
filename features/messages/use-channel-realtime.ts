"use client";

import { useEffect, useRef, useState } from "react";
import { useSession } from "@clerk/nextjs";
import {
  getSupabaseBrowserClient,
  setSupabaseTokenGetter,
} from "../messages/supabase-browser";
import {
  subscribeToChannel,
  type RealtimeClientLike,
} from "../messages/subscribe-to-channel";
import type { MessageRealtimeEvent, RealtimeStatus } from "./Types";

type ChannelRealtimeHandlers = {
  /** Called for every validated created / updated / deleted event. */
  onEvent: (event: MessageRealtimeEvent) => void;
  /**
   * Called each time the channel becomes live, the first time included
   * (`reconnect: false`). Refetch the newest page and merge it here - events
   * missed while offline, or between loading history and going live, are
   * never replayed.
   */
  onLive?: (info: { reconnect: boolean }) => void;
};

type ConnectionState = { status: RealtimeStatus; detail: string | null };

/**
 * Subscribes to realtime message events for one channel. Pass `null` to stay
 * idle. Handlers may change identity on every render without causing a
 * resubscribe.
 */
export function useChannelRealtime(
  channelId: string | null,
  handlers: ChannelRealtimeHandlers,
): ConnectionState {
  const { isLoaded, isSignedIn, session } = useSession();
  const [connection, setConnection] = useState<ConnectionState>({
    status: "connecting",
    detail: null,
  });

  // Always call the latest handlers without re-subscribing when they change.
  const handlersRef = useRef(handlers);
  useEffect(() => {
    handlersRef.current = handlers;
  });

  // Point the shared client's token source at the current Clerk session.
  // Declared before the subscribe effect so it runs first on mount.
  useEffect(() => {
    setSupabaseTokenGetter(async () => (await session?.getToken()) ?? null);
  }, [session]);

  const enabled = Boolean(channelId) && isLoaded && Boolean(isSignedIn);

  useEffect(() => {
    if (!enabled || !channelId) return;

    return subscribeToChannel({
      // The structural type documents exactly which parts of the client we use.
      client: getSupabaseBrowserClient() as unknown as RealtimeClientLike,
      channelId,
      onEvent: (event) => handlersRef.current.onEvent(event),
      onLive: (info) => handlersRef.current.onLive?.(info),
      onStatus: (status, detail) =>
        setConnection({ status, detail: detail ?? null }),
    });
  }, [enabled, channelId]);

  return enabled ? connection : { status: "idle", detail: null };
}
