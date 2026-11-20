import type {
  ErrorCode,
  MessageCursor,
  MessageDTO,
  MessagePage,
  MessageRealtimeEvent,
  MessageViewerDTO,
} from "./Types";

/**
 * Pure state logic for one channel. No React, no Zustand, no I/O: every
 * function takes a ChannelState and returns a NEW one - or the SAME reference
 * when nothing changed, so subscribers don't re-render for no-ops.
 *
 * The rules that make realtime chat trustworthy live here:
 *  - one canonical order (createdAt, id), identical to the server's
 *  - server truth always beats a local guess; stale data never beats fresh data
 *  - a deleted message can never come back from a late event or a stale fetch
 *  - a resync can detect "I missed more than one page" and avoid showing a hole
 */

export type Delivery = "sending" | "failed";

export type StoreMessage = MessageDTO & {
  /** Set ONLY while the server has not confirmed this message yet. */
  delivery?: Delivery;
  deliveryError?: string;
};

export type LoadStatus = "idle" | "loading" | "ready" | "error";

export type ChannelState = {
  status: LoadStatus;
  error: string | null;
  errorCode: ErrorCode | null;
  /** Confirmed messages (oldest -> newest), then unconfirmed ones in send order. */
  messages: StoreMessage[];
  /** True while older messages exist on the server. */
  hasMore: boolean;
  /** Pass as `before` to load older messages. */
  cursor: MessageCursor | null;
  loadingOlder: boolean;
  viewer: MessageViewerDTO | null;
  /** Ids known to be deleted (newest last, capped). */
  deleted: string[];
};

export const MAX_TOMBSTONES = 200;

export function createChannelState(): ChannelState {
  return {
    status: "idle",
    error: null,
    errorCode: null,
    messages: [],
    hasMore: false,
    cursor: null,
    loadingOlder: false,
    viewer: null,
    deleted: [],
  };
}

/** Shared, never mutated. Safe to return from selectors (stable reference). */
export const EMPTY_CHANNEL: ChannelState = createChannelState();

// --- Ordering -------------------------------------------------------------------

type Keyed = Pick<MessageDTO, "createdAt" | "id">;

/**
 * Same order as the server's `ORDER BY createdAt, id`. createdAt is always a
 * fixed-length ISO string, so plain string comparison is correct. Ids are
 * lowercase hex uuids, whose string order equals Postgres' uuid order.
 */
export function compareMessages(a: Keyed, b: Keyed): number {
  if (a.createdAt !== b.createdAt) return a.createdAt < b.createdAt ? -1 : 1;
  if (a.id !== b.id) return a.id < b.id ? -1 : 1;
  return 0;
}

/**
 * Confirmed messages sorted by the canonical order; unconfirmed ones always
 * stay at the bottom in the order they were sent. (A local clock that runs
 * behind the server must never make your pending message jump up the list.)
 */
function normalize(messages: StoreMessage[]): StoreMessage[] {
  const confirmed: StoreMessage[] = [];
  const unconfirmed: StoreMessage[] = [];
  for (const message of messages) {
    (message.delivery ? unconfirmed : confirmed).push(message);
  }
  confirmed.sort(compareMessages);
  return [...confirmed, ...unconfirmed];
}

// --- Merge rules ------------------------------------------------------------------

/**
 * Should `incoming` replace what we have? `editedAt` acts as a version number:
 * the server response, the realtime echo and a resync can arrive in any order,
 * and an older copy must never overwrite a newer edit.
 */
function shouldApply(
  existing: StoreMessage | undefined,
  incoming: MessageDTO,
): boolean {
  if (!existing) return true;
  if (existing.delivery) return true; // a local guess always yields to the server
  return (incoming.editedAt ?? "") >= (existing.editedAt ?? "");
}

function isSame(a: MessageDTO, b: MessageDTO): boolean {
  if (
    a.id !== b.id ||
    a.content !== b.content ||
    a.createdAt !== b.createdAt ||
    a.editedAt !== b.editedAt ||
    a.attachments.length !== b.attachments.length
  ) {
    return false;
  }
  return a.attachments.every(
    (attachment, i) =>
      attachment.id === b.attachments[i].id &&
      attachment.url === b.attachments[i].url,
  );
}

/** Insert or update confirmed messages. Tombstoned ids are ignored. */
export function upsertMany(
  state: ChannelState,
  incoming: MessageDTO[],
): ChannelState {
  const next = state.messages.slice();
  const indexById = new Map(next.map((message, i) => [message.id, i]));
  const tombstones = new Set(state.deleted);
  let changed = false;

  for (const message of incoming) {
    if (tombstones.has(message.id)) continue;

    const i = indexById.get(message.id);
    const existing = i === undefined ? undefined : next[i];
    if (!shouldApply(existing, message)) continue;
    if (existing && !existing.delivery && isSame(existing, message)) continue;

    if (i === undefined) {
      indexById.set(message.id, next.length);
      next.push(message);
    } else {
      next[i] = message;
    }
    changed = true;
  }

  return changed ? { ...state, messages: normalize(next) } : state;
}

export function upsertMessage(
  state: ChannelState,
  incoming: MessageDTO,
): ChannelState {
  return upsertMany(state, [incoming]);
}

function withTombstone(deleted: string[], id: string): string[] {
  return deleted.includes(id)
    ? deleted
    : [...deleted, id].slice(-MAX_TOMBSTONES);
}

/** The message is really gone: remove it and remember that. */
export function removeMessage(state: ChannelState, id: string): ChannelState {
  const present = state.messages.some((message) => message.id === id);
  const deleted = withTombstone(state.deleted, id);
  if (!present && deleted === state.deleted) return state;
  return {
    ...state,
    messages: present
      ? state.messages.filter((message) => message.id !== id)
      : state.messages,
    deleted,
  };
}

/** Optimistic delete: hide it now, but remember nothing until the server agrees. */
export function removeProvisionally(
  state: ChannelState,
  id: string,
): ChannelState {
  if (!state.messages.some((message) => message.id === id)) return state;
  return {
    ...state,
    messages: state.messages.filter((message) => message.id !== id),
  };
}

/** Roll back an optimistic delete - unless it was really deleted meanwhile. */
export function restoreMessage(
  state: ChannelState,
  message: StoreMessage,
): ChannelState {
  if (state.deleted.includes(message.id)) return state;
  if (state.messages.some((existing) => existing.id === message.id)) {
    return state;
  }
  return { ...state, messages: normalize([...state.messages, message]) };
}

// --- Unconfirmed (optimistic) messages ---------------------------------------------

export function addUnconfirmed(
  state: ChannelState,
  message: StoreMessage,
): ChannelState {
  if (state.messages.some((existing) => existing.id === message.id)) {
    return state;
  }
  return { ...state, messages: [...state.messages, message] };
}

function mapMessage(
  state: ChannelState,
  id: string,
  update: (message: StoreMessage) => StoreMessage,
): ChannelState {
  let changed = false;
  const messages = state.messages.map((message) => {
    if (message.id !== id) return message;
    const next = update(message);
    if (next !== message) changed = true;
    return next;
  });
  return changed ? { ...state, messages } : state;
}

export function markSending(state: ChannelState, id: string): ChannelState {
  return mapMessage(state, id, (message) => {
    if (message.delivery !== "failed") return message;
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const { deliveryError, ...rest } = message;
    return { ...rest, delivery: "sending" };
  });
}

export function markFailed(
  state: ChannelState,
  id: string,
  error: string,
): ChannelState {
  return mapMessage(state, id, (message) =>
    message.delivery
      ? { ...message, delivery: "failed", deliveryError: error }
      : message,
  );
}

/** Remove a message that was never confirmed (discard a failed send). */
export function discardUnconfirmed(
  state: ChannelState,
  id: string,
): ChannelState {
  const target = state.messages.find((message) => message.id === id);
  if (!target || !target.delivery) return state;
  return {
    ...state,
    messages: state.messages.filter((message) => message.id !== id),
  };
}

// --- Optimistic edit ------------------------------------------------------------------

export function applyOptimisticEdit(
  state: ChannelState,
  id: string,
  content: string | null,
): ChannelState {
  return mapMessage(state, id, (message) =>
    message.delivery || message.content === content
      ? message
      : { ...message, content },
  );
}

/**
 * Roll back an optimistic edit, but only if nothing newer has replaced it
 * (a realtime update may have landed while the request was in flight).
 */
export function rollbackEdit(
  state: ChannelState,
  snapshot: StoreMessage,
  optimisticContent: string | null,
): ChannelState {
  return mapMessage(state, snapshot.id, (message) =>
    message.content === optimisticContent &&
    message.editedAt === snapshot.editedAt
      ? snapshot
      : message,
  );
}

// --- Realtime events ----------------------------------------------------------------------

/**
 * Is a message "inside" what we have loaded? An update for something older
 * than our oldest loaded message (with more history unloaded) is irrelevant
 * and must not be inserted out of nowhere at the top of the list.
 */
function isWithinLoadedWindow(state: ChannelState, message: MessageDTO) {
  if (state.messages.some((existing) => existing.id === message.id)) {
    return true;
  }
  if (!state.hasMore) return true; // everything (or nothing yet) is loaded
  const oldest = state.messages.find((existing) => !existing.delivery);
  return oldest === undefined || compareMessages(message, oldest) >= 0;
}

export function applyEvent(
  state: ChannelState,
  event: MessageRealtimeEvent,
): ChannelState {
  switch (event.type) {
    case "created":
      return upsertMessage(state, event.message);
    case "updated":
      return isWithinLoadedWindow(state, event.message)
        ? upsertMessage(state, event.message)
        : state;
    case "deleted":
      return removeMessage(state, event.id);
  }
}

// --- Loading -----------------------------------------------------------------------------------

export function markLoading(state: ChannelState): ChannelState {
  if (state.status === "loading" && state.error === null) return state;
  return { ...state, status: "loading", error: null, errorCode: null };
}

export function markError(
  state: ChannelState,
  error: string,
  errorCode: ErrorCode,
): ChannelState {
  return { ...state, status: "error", error, errorCode, loadingOlder: false };
}

/**
 * Merge the NEWEST page into the channel. Used for the first load and for
 * every resync after a (re)connect.
 *
 * `protectedIds` are messages that arrived live AFTER this request started.
 * The page is an older snapshot, so it must neither delete them nor be used
 * to judge what we already had.
 *
 * Besides adding/updating messages it:
 *  - removes messages that fall inside the page's time range but are missing
 *    from it (they were deleted while we were offline);
 *  - detects a GAP: if we missed more than one page, our old messages and the
 *    new page don't touch, and showing both would hide a hole in the history.
 *    In that case the old messages are dropped and pagination restarts from
 *    the new page.
 */
export function applyNewestPage(
  state: ChannelState,
  page: MessagePage,
  protectedIds: ReadonlySet<string>,
): ChannelState {
  const respIds = new Set(page.messages.map((message) => message.id));
  const oldestResp = page.messages[0];
  const newestResp = page.messages[page.messages.length - 1];

  // What we already knew before this request began (confirmed only, sorted).
  const preexisting = state.messages.filter(
    (message) => !message.delivery && !protectedIds.has(message.id),
  );
  const newestKnown = preexisting[preexisting.length - 1];

  const gap =
    page.nextCursor !== null &&
    oldestResp !== undefined &&
    newestKnown !== undefined &&
    compareMessages(oldestResp, newestKnown) > 0;

  let base = state;

  if (gap) {
    const keep = (message: StoreMessage) =>
      Boolean(message.delivery) || protectedIds.has(message.id);
    base = { ...state, messages: state.messages.filter(keep) };
  } else {
    // If the page reaches the very start of the channel there is no lower bound.
    const lower = page.nextCursor === null ? undefined : oldestResp;
    const gone = new Set(
      preexisting
        .filter((message) => {
          if (respIds.has(message.id)) return false;
          if (lower && compareMessages(message, lower) < 0) return false;
          if (newestResp && compareMessages(message, newestResp) > 0) {
            return false;
          }
          return true;
        })
        .map((message) => message.id),
    );
    if (gone.size > 0) {
      base = {
        ...state,
        messages: state.messages.filter((message) => !gone.has(message.id)),
      };
    }
  }

  const merged = upsertMany(base, page.messages);

  // Pagination comes from this page on the first load, after a gap, or when we
  // had nothing before; otherwise our existing (possibly deeper) cursor stays.
  const resetPagination =
    state.status !== "ready" || gap || preexisting.length === 0;

  return {
    ...merged,
    status: "ready",
    error: null,
    errorCode: null,
    viewer: page.viewer,
    ...(resetPagination
      ? { hasMore: page.nextCursor !== null, cursor: page.nextCursor }
      : {}),
  };
}

export function markLoadingOlder(state: ChannelState): ChannelState {
  return state.loadingOlder ? state : { ...state, loadingOlder: true };
}

export function clearLoadingOlder(state: ChannelState): ChannelState {
  return state.loadingOlder ? { ...state, loadingOlder: false } : state;
}

/**
 * Merge an OLDER page. `usedCursor` is the cursor the request was made with;
 * if a gap-reset changed the pagination while the request was in flight, the
 * result no longer fits and is discarded.
 */
export function applyOlderPage(
  state: ChannelState,
  page: MessagePage,
  usedCursor: MessageCursor,
): ChannelState {
  const stillValid =
    state.cursor !== null &&
    state.cursor.id === usedCursor.id &&
    state.cursor.createdAt === usedCursor.createdAt;
  if (!stillValid) return clearLoadingOlder(state);

  const merged = upsertMany(state, page.messages);
  return {
    ...merged,
    loadingOlder: false,
    viewer: page.viewer,
    hasMore: page.nextCursor !== null,
    cursor: page.nextCursor,
  };
}
