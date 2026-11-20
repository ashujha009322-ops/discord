import { createStore, type StoreApi } from "zustand/vanilla";
import { MESSAGE_MAX_LENGTH } from "../features/messages/Constants";
import {
  buildSendMessageFormData,
  type DeleteMessageInput,
  type EditMessageInput,
  type GetMessagesInput,
} from "../features/messages/Message.schema";
import type {
  ActionResult,
  ErrorCode,
  MessageDTO,
  MessagePage,
  MessageRealtimeEvent,
} from "../features/messages/Types";
import {
  addUnconfirmed,
  applyEvent as applyEventToChannel,
  applyNewestPage,
  applyOlderPage,
  applyOptimisticEdit,
  clearLoadingOlder,
  createChannelState,
  discardUnconfirmed,
  markError,
  markFailed,
  markLoading,
  markLoadingOlder,
  markSending,
  removeMessage,
  removeProvisionally,
  restoreMessage,
  rollbackEdit,
  upsertMessage,
  type ChannelState,
  type StoreMessage,
} from "../features/messages/Message-state";

/**
 * Everything the store needs from the outside world. The app passes the real
 * server actions; tests pass fakes. (This file never imports the actions, so
 * it is testable without a server.)
 */
export type StoreDeps = {
  sendMessage(formData: FormData): Promise<ActionResult<MessageDTO>>;
  getMessages(input: GetMessagesInput): Promise<ActionResult<MessagePage>>;
  editMessage(input: EditMessageInput): Promise<ActionResult<MessageDTO>>;
  deleteMessage(
    input: DeleteMessageInput,
  ): Promise<ActionResult<{ id: string; channelId: string }>>;
  newId(): string;
  now(): number;
};

export type Outcome =
  | { ok: true }
  | { ok: false; error: string; code: ErrorCode };

export type SendOutcome =
  | { ok: true; id: string }
  | { ok: false; error: string; code: ErrorCode; id?: string };

export type SendInput = { content?: string; files?: File[] };

export type MessageStoreState = {
  channels: Record<string, ChannelState>;

  /**
   * Load or refresh a channel.
   *  "select": the channel was opened - loads it if it isn't loaded yet.
   *  "live":   the realtime channel just became live (first join OR reconnect)
   *            - always refetches the newest page and merges it, because
   *            anything that happened before the socket was live is never
   *            replayed. Requests are coalesced: at most one in flight per
   *            channel, plus one follow-up if "live" fired meanwhile.
   */
  sync(channelId: string, reason: "select" | "live"): Promise<void>;
  loadOlder(channelId: string): Promise<Outcome>;
  applyEvent(event: MessageRealtimeEvent): void;

  send(channelId: string, input: SendInput): Promise<SendOutcome>;
  retry(channelId: string, id: string): Promise<SendOutcome>;
  discard(channelId: string, id: string): void;
  edit(channelId: string, id: string, content: string): Promise<Outcome>;
  remove(channelId: string, id: string): Promise<Outcome>;

  resetChannel(channelId: string): void;
  /** Call on sign-out / account switch: drops everything and ignores in-flight results. */
  clearAll(): void;
};

export type MessageStore = StoreApi<MessageStoreState>;

type SendPayload = { channelId: string; content?: string; files?: File[] };

/** Errors that mean "you can't be here" rather than "try again". */
const FATAL_CODES: ReadonlySet<ErrorCode> = new Set([
  "UNAUTHENTICATED",
  "USER_NOT_FOUND",
  "NOT_A_MEMBER",
  "FORBIDDEN",
  "NOT_FOUND",
  "UNSUPPORTED_CHANNEL",
]);

const MAX_ARRIVALS_PER_CHANNEL = 500;

function fail(
  code: ErrorCode,
  error: string,
): { ok: false; error: string; code: ErrorCode } {
  return { ok: false, error, code };
}

export function createMessageStore(deps: StoreDeps): MessageStore {
  // Non-reactive bookkeeping (kept out of Zustand state on purpose: it never
  // needs to re-render anything, and Files must not live in serializable state).
  const arrivals = new Map<string, Map<string, number>>(); // channel -> id -> arrival time
  const payloads = new Map<string, SendPayload>(); // unsent message id -> what to (re)send
  const running = new Map<string, { rerun: boolean; promise: Promise<void> }>();
  let epoch = 0; // bumped by clearAll() so late responses can be ignored

  /** Calls a server action; a thrown error (offline, deploy skew) becomes a NETWORK failure. */
  async function safe<T>(
    call: () => Promise<ActionResult<T>>,
  ): Promise<ActionResult<T>> {
    try {
      return await call();
    } catch (error) {
      console.warn(
        "[messages] request failed before reaching the server",
        error,
      );
      return {
        success: false,
        error: "Network error. Check your connection and try again.",
        code: "NETWORK",
      };
    }
  }

  function markArrival(channelId: string, id: string) {
    let map = arrivals.get(channelId);
    if (!map) {
      map = new Map();
      arrivals.set(channelId, map);
    }
    map.set(id, deps.now());
    if (map.size > MAX_ARRIVALS_PER_CHANNEL) {
      for (const key of [...map.keys()].slice(0, 100)) map.delete(key);
    }
  }

  /** Messages that arrived live at or after `since` - a resync must not judge them. */
  function arrivedSince(channelId: string, since: number): Set<string> {
    const result = new Set<string>();
    for (const [id, at] of arrivals.get(channelId) ?? []) {
      if (at >= since) result.add(id);
    }
    return result;
  }

  return createStore<MessageStoreState>()((set, get) => {
    /** Update one channel; returns the same state (no notification) when nothing changed. */
    const update = (
      channelId: string,
      change: (channel: ChannelState) => ChannelState,
    ) =>
      set((state) => {
        const current = state.channels[channelId] ?? createChannelState();
        const next = change(current);
        if (next === current) return state;
        return { channels: { ...state.channels, [channelId]: next } };
      });

    const findMessage = (channelId: string, id: string) =>
      get().channels[channelId]?.messages.find((message) => message.id === id);

    // --- Sync ---------------------------------------------------------------------

    async function syncOnce(channelId: string) {
      const startedAt = deps.now();
      const startEpoch = epoch;

      update(channelId, (channel) =>
        channel.status === "ready" ? channel : markLoading(channel),
      );

      const result = await safe(() => deps.getMessages({ channelId }));
      if (startEpoch !== epoch) return;

      if (!result.success) {
        const wasReady = get().channels[channelId]?.status === "ready";
        if (!wasReady || FATAL_CODES.has(result.code)) {
          update(channelId, (channel) =>
            markError(channel, result.error, result.code),
          );
        } else {
          // A refresh that fails while we already show data is not worth an error screen.
          console.warn("[messages] resync failed:", result.code);
        }
        return;
      }

      const protectedIds = arrivedSince(channelId, startedAt);
      update(channelId, (channel) =>
        applyNewestPage(channel, result.data, protectedIds),
      );
    }

    function sync(channelId: string, reason: "select" | "live"): Promise<void> {
      const inFlight = running.get(channelId);
      if (inFlight) {
        // A "live" signal means the snapshot being fetched may already be stale.
        if (reason === "live") inFlight.rerun = true;
        return inFlight.promise;
      }

      if (reason === "select") {
        const channel = get().channels[channelId];
        if (channel && channel.status === "ready") return Promise.resolve();
      }

      const entry = { rerun: false, promise: Promise.resolve() };
      const loopEpoch = epoch;
      running.set(channelId, entry);
      entry.promise = (async () => {
        try {
          do {
            entry.rerun = false;
            await syncOnce(channelId);
            // Stop if the store was cleared (sign-out) while we were fetching.
          } while (entry.rerun && loopEpoch === epoch);
        } finally {
          // Only remove our own entry (clearAll may have replaced the map).
          if (running.get(channelId) === entry) running.delete(channelId);
        }
      })();
      return entry.promise;
    }

    // --- Sending ---------------------------------------------------------------------

    async function deliver(
      channelId: string,
      id: string,
    ): Promise<SendOutcome> {
      const payload = payloads.get(id);
      if (!payload) return { ...fail("INTERNAL", "Nothing to send."), id };

      const startEpoch = epoch;
      const result = await safe(() =>
        deps.sendMessage(
          buildSendMessageFormData({
            id,
            channelId,
            content: payload.content,
            files: payload.files,
          }),
        ),
      );
      if (startEpoch !== epoch) return { ok: true, id };

      if (result.success) {
        payloads.delete(id);
        markArrival(channelId, id);
        update(channelId, (channel) => upsertMessage(channel, result.data));
        return { ok: true, id };
      }

      // The request failed, but the message may exist anyway (the server saved it
      // and only the response was lost, and the realtime echo already confirmed it).
      const current = findMessage(channelId, id);
      if (current && !current.delivery) {
        payloads.delete(id);
        return { ok: true, id };
      }

      update(channelId, (channel) => markFailed(channel, id, result.error));
      return { ...fail(result.code, result.error), id };
    }

    return {
      channels: {},

      sync,

      async loadOlder(channelId) {
        const channel = get().channels[channelId];
        if (
          !channel ||
          channel.status !== "ready" ||
          !channel.hasMore ||
          !channel.cursor ||
          channel.loadingOlder
        ) {
          return { ok: true };
        }

        const usedCursor = channel.cursor;
        const startEpoch = epoch;
        update(channelId, markLoadingOlder);

        const result = await safe(() =>
          deps.getMessages({ channelId, before: usedCursor }),
        );
        if (startEpoch !== epoch) return { ok: true };

        if (!result.success) {
          update(channelId, clearLoadingOlder);
          return fail(result.code, result.error);
        }

        update(channelId, (state) =>
          applyOlderPage(state, result.data, usedCursor),
        );
        return { ok: true };
      },

      applyEvent(event) {
        if (event.type === "deleted") {
          update(event.channelId, (channel) =>
            applyEventToChannel(channel, event),
          );
          return;
        }
        markArrival(event.message.channelId, event.message.id);
        update(event.message.channelId, (channel) =>
          applyEventToChannel(channel, event),
        );
      },

      async send(channelId, input) {
        const channel = get().channels[channelId];
        if (!channel || channel.status !== "ready" || !channel.viewer) {
          return fail("VALIDATION", "This channel is not ready yet.");
        }

        const content = (input.content ?? "").trim();
        const files =
          input.files && input.files.length > 0 ? input.files : undefined;

        if (!content && !files) {
          return fail("VALIDATION", "Message cannot be empty.");
        }
        if (content.length > MESSAGE_MAX_LENGTH) {
          return fail(
            "VALIDATION",
            `Message cannot exceed ${MESSAGE_MAX_LENGTH} characters.`,
          );
        }
        const { timeoutUntil } = channel.viewer;
        if (timeoutUntil && new Date(timeoutUntil).getTime() > deps.now()) {
          return fail(
            "TIMED_OUT",
            "You are timed out and cannot send messages right now.",
          );
        }

        const id = deps.newId();
        payloads.set(id, { channelId, content: content || undefined, files });

        const optimistic: StoreMessage = {
          id,
          channelId,
          content: content || null,
          createdAt: new Date(deps.now()).toISOString(),
          editedAt: null,
          author: channel.viewer.author,
          // Stage 5 shows local previews of the picked files here.
          attachments: [],
          delivery: "sending",
        };
        update(channelId, (state) => addUnconfirmed(state, optimistic));

        return deliver(channelId, id);
      },

      async retry(channelId, id) {
        const message = findMessage(channelId, id);
        if (!message || message.delivery !== "failed") {
          return { ...fail("VALIDATION", "Nothing to retry."), id };
        }
        update(channelId, (state) => markSending(state, id));
        // Same id as before: if the first attempt actually reached the server,
        // the server returns that message instead of creating a duplicate.
        return deliver(channelId, id);
      },

      discard(channelId, id) {
        payloads.delete(id);
        update(channelId, (state) => discardUnconfirmed(state, id));
      },

      async edit(channelId, id, content) {
        const snapshot = findMessage(channelId, id);
        if (!snapshot) return fail("NOT_FOUND", "Message not found.");
        if (snapshot.delivery) {
          return fail("VALIDATION", "This message has not been sent yet.");
        }

        const text = content.trim();
        if (text === (snapshot.content ?? "")) return { ok: true };
        if (!text && snapshot.attachments.length === 0) {
          return fail("VALIDATION", "Message cannot be empty.");
        }
        if (text.length > MESSAGE_MAX_LENGTH) {
          return fail(
            "VALIDATION",
            `Message cannot exceed ${MESSAGE_MAX_LENGTH} characters.`,
          );
        }

        const optimisticContent = text || null;
        const startEpoch = epoch;
        update(channelId, (state) =>
          applyOptimisticEdit(state, id, optimisticContent),
        );

        const result = await safe(() =>
          deps.editMessage({ messageId: id, content: text }),
        );
        if (startEpoch !== epoch) return { ok: true };

        if (result.success) {
          markArrival(channelId, id);
          update(channelId, (state) => upsertMessage(state, result.data));
          return { ok: true };
        }

        if (result.code === "NOT_FOUND") {
          update(channelId, (state) => removeMessage(state, id)); // deleted meanwhile
        } else {
          update(channelId, (state) =>
            rollbackEdit(state, snapshot, optimisticContent),
          );
        }
        return fail(result.code, result.error);
      },

      async remove(channelId, id) {
        const snapshot = findMessage(channelId, id);
        if (!snapshot) return { ok: true }; // already gone

        if (snapshot.delivery) {
          // Never reached the server: nothing to delete there.
          payloads.delete(id);
          update(channelId, (state) => discardUnconfirmed(state, id));
          return { ok: true };
        }

        const startEpoch = epoch;
        update(channelId, (state) => removeProvisionally(state, id));

        const result = await safe(() => deps.deleteMessage({ messageId: id }));
        if (startEpoch !== epoch) return { ok: true };

        // NOT_FOUND = already deleted (e.g. by the owner): same end state.
        if (result.success || result.code === "NOT_FOUND") {
          update(channelId, (state) => removeMessage(state, id));
          return { ok: true };
        }

        update(channelId, (state) => restoreMessage(state, snapshot));
        return fail(result.code, result.error);
      },

      resetChannel(channelId) {
        arrivals.delete(channelId);
        set((state) => {
          if (!(channelId in state.channels)) return state;
          const channels = { ...state.channels };
          delete channels[channelId];
          return { channels };
        });
      },

      clearAll() {
        epoch += 1;
        arrivals.clear();
        payloads.clear();
        running.clear();
        set({ channels: {} });
      },
    };
  });
}
