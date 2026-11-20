import {
  MESSAGE_REALTIME_EVENTS,
  REALTIME_TOKEN_REFRESH_MS,
  channelTopic,
} from "./Constants";
import type {
  MessageDTO,
  MessageRealtimeEvent,
  RealtimeStatus,
} from "./Types";

/**
 * The slice of the Supabase client this module touches. Written as a
 * structural type so the logic can be tested with a fake and so this file has
 * no dependency on a particular supabase-js version.
 */
export type BroadcastMessage = { payload?: unknown };

export type RealtimeChannelLike = {
  on(
    type: "broadcast",
    filter: { event: string },
    callback: (message: BroadcastMessage) => void,
  ): RealtimeChannelLike;
  subscribe(
    callback?: (status: string, error?: { message?: string }) => void,
  ): RealtimeChannelLike;
};

export type RealtimeClientLike = {
  channel(
    topic: string,
    options: { config: { private: boolean } },
  ): RealtimeChannelLike;
  removeChannel(channel: RealtimeChannelLike): Promise<unknown>;
  realtime: { setAuth(): Promise<unknown> };
};

export type SubscribeToChannelOptions = {
  client: RealtimeClientLike;
  channelId: string;
  onEvent: (event: MessageRealtimeEvent) => void;
  /** Fires on every status change, starting with an immediate "connecting". */
  onStatus?: (status: RealtimeStatus, detail?: string) => void;
  /**
   * Fires EVERY time the channel becomes live, including the first time.
   * `reconnect` is false for the first join and true afterwards.
   *
   * Why this matters: events that happened while the socket was down (or
   * between "history loaded" and "subscription live") are never replayed.
   * The consumer should refetch the newest page and merge it on each call.
   */
  onLive?: (info: { reconnect: boolean }) => void;
  tokenRefreshMs?: number;
};

// --- Payload validation ---------------------------------------------------------
// Only the server can publish to these topics, but a malformed or mismatched
// payload must never reach the store, so everything is checked here.

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

function isMessageDTO(value: unknown, channelId: string): value is MessageDTO {
  return (
    isRecord(value) &&
    typeof value.id === "string" &&
    value.channelId === channelId &&
    typeof value.createdAt === "string" &&
    (value.content === null || typeof value.content === "string") &&
    Array.isArray(value.attachments)
  );
}

function parseEvent(
  kind: "created" | "updated" | "deleted",
  payload: unknown,
  channelId: string,
): MessageRealtimeEvent | null {
  if (!isRecord(payload)) return null;

  if (kind === "deleted") {
    return typeof payload.id === "string" && payload.channelId === channelId
      ? { type: "deleted", id: payload.id, channelId }
      : null;
  }

  return isMessageDTO(payload.message, channelId)
    ? { type: kind, message: payload.message }
    : null;
}

// --- Subscription -----------------------------------------------------------------

/**
 * Subscribes to one channel's message events and returns a cleanup function.
 * Safe under React StrictMode's mount -> unmount -> mount: cleanup before the
 * async setup finishes simply prevents the channel from ever being created.
 */
export function subscribeToChannel(
  options: SubscribeToChannelOptions,
): () => void {
  const {
    client,
    channelId,
    onEvent,
    onStatus,
    onLive,
    tokenRefreshMs = REALTIME_TOKEN_REFRESH_MS,
  } = options;

  let disposed = false;
  let hasBeenLive = false;
  let channel: RealtimeChannelLike | null = null;

  const emit = (status: RealtimeStatus, detail?: string) => {
    if (!disposed) onStatus?.(status, detail);
  };

  // With the `accessToken` callback option, setAuth() with no arguments fetches
  // a fresh token and pushes it to every joined channel. That is what keeps the
  // connection alive (Realtime drops a channel whose JWT expires) and what makes
  // a revoked membership take effect at the next refresh.
  const refreshToken = () => {
    client.realtime.setAuth().catch((error: unknown) => {
      console.warn("[messages] realtime token refresh failed", error);
    });
  };

  emit("connecting");

  const interval = setInterval(refreshToken, tokenRefreshMs);

  // Browsers throttle timers in background tabs, so a refresh can be missed.
  // Refresh immediately when the tab becomes visible or the network returns.
  const doc = typeof document !== "undefined" ? document : null;
  const win = typeof window !== "undefined" ? window : null;
  const onVisibility = () => {
    if (doc && doc.visibilityState === "visible") refreshToken();
  };
  doc?.addEventListener("visibilitychange", onVisibility);
  win?.addEventListener("online", refreshToken);

  const handle =
    (kind: "created" | "updated" | "deleted") =>
    (message: BroadcastMessage) => {
      if (disposed) return;
      const event = parseEvent(kind, message.payload, channelId);
      if (event) {
        onEvent(event);
      } else {
        console.warn("[messages] ignored malformed realtime payload", kind);
      }
    };

  void (async () => {
    // Realtime Authorization requires the token to be set BEFORE subscribing.
    try {
      await client.realtime.setAuth();
    } catch (error) {
      // Not fatal: the join will fail and be retried; the interval keeps trying.
      console.warn("[messages] realtime initial auth failed", error);
    }
    if (disposed) return;

    channel = client
      .channel(channelTopic(channelId), { config: { private: true } })
      .on(
        "broadcast",
        { event: MESSAGE_REALTIME_EVENTS.created },
        handle("created"),
      )
      .on(
        "broadcast",
        { event: MESSAGE_REALTIME_EVENTS.updated },
        handle("updated"),
      )
      .on(
        "broadcast",
        { event: MESSAGE_REALTIME_EVENTS.deleted },
        handle("deleted"),
      )
      .subscribe((status, error) => {
        if (disposed) return;

        if (status === "SUBSCRIBED") {
          const reconnect = hasBeenLive;
          hasBeenLive = true;
          emit("live");
          onLive?.({ reconnect });
        } else if (
          status === "CHANNEL_ERROR" ||
          status === "TIMED_OUT" ||
          status === "CLOSED"
        ) {
          // supabase-js keeps retrying on its own; we only report it.
          emit("disconnected", error?.message ?? status);
        }
      });
  })();

  return () => {
    disposed = true;
    clearInterval(interval);
    doc?.removeEventListener("visibilitychange", onVisibility);
    win?.removeEventListener("online", refreshToken);
    if (channel) {
      Promise.resolve(client.removeChannel(channel)).catch(() => {});
    }
  };
}
