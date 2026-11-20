"use client";

import { useCallback, useEffect, useMemo } from "react";
import { useAuth } from "@clerk/nextjs";
import { canDeleteMessage, canEditMessage } from "../messages/Permissions";
import {
  EMPTY_CHANNEL,
  type StoreMessage,
} from "../../features/messages/Message-state";
import type { Outcome, SendInput, SendOutcome } from "@/store/message-store";
import { messageStore, useMessageStore } from "@/store/useMessageStore";
import { useChannelRealtime } from "./use-channel-realtime";

const NO_CHANNEL: Outcome = {
  ok: false,
  code: "VALIDATION",
  error: "No channel selected.",
};

const NOOP_ACTIONS = {
  send: async (): Promise<SendOutcome> => NO_CHANNEL,
  retry: async (): Promise<SendOutcome> => NO_CHANNEL,
  discard: (): void => {},
  edit: async (): Promise<Outcome> => NO_CHANNEL,
  remove: async (): Promise<Outcome> => NO_CHANNEL,
  loadOlder: async (): Promise<Outcome> => NO_CHANNEL,
  reload: async (): Promise<void> => {},
};

/** The last signed-in user this module saw (to detect sign-out / account switch). */
let lastUserId: string | null | undefined;

/**
 * Everything the chat UI needs for ONE channel:
 *  - history (oldest -> newest) with scroll-up pagination
 *  - realtime created / updated / deleted merged in, de-duplicated and ordered
 *  - optimistic send / edit / delete with rollback, plus retry for failed sends
 *  - `canEdit` / `canDelete` so the UI knows which buttons to show
 *
 * Pass `null` when no channel is selected. Switching channels is instant for
 * channels you already visited (their messages are cached, then refreshed).
 */
export function useChannelMessages(channelId: string | null) {
  const { isLoaded, isSignedIn, userId } = useAuth();

  // Never let one account see another account's cached messages.
  useEffect(() => {
    if (!isLoaded) return;
    const current = userId ?? null;
    if (lastUserId !== undefined && lastUserId !== current) {
      messageStore.getState().clearAll();
    }
    lastUserId = current;
  }, [isLoaded, userId]);

  const activeId = channelId && isLoaded && isSignedIn ? channelId : null;

  // `undefined` and the stored object are both stable references (see the
  // selector rule in use-message-store.ts).
  const channel =
    useMessageStore((state) =>
      activeId ? state.channels[activeId] : undefined,
    ) ?? EMPTY_CHANNEL;

  // Load history as soon as the channel is opened (it does not wait for the socket).
  useEffect(() => {
    if (activeId) void messageStore.getState().sync(activeId, "select");
  }, [activeId]);

  // Realtime. Every time the channel becomes live - the first join included -
  // refetch the newest page: anything that happened before the socket was live
  // is never replayed.
  const connection = useChannelRealtime(activeId, {
    onEvent: (event) => messageStore.getState().applyEvent(event),
    onLive: () => {
      if (activeId) void messageStore.getState().sync(activeId, "live");
    },
  });

  const actions = useMemo(() => {
    if (!activeId) return NOOP_ACTIONS;
    const api = () => messageStore.getState();
    return {
      send: (input: SendInput) => api().send(activeId, input),
      retry: (id: string) => api().retry(activeId, id),
      discard: (id: string) => api().discard(activeId, id),
      edit: (id: string, content: string) => api().edit(activeId, id, content),
      remove: (id: string) => api().remove(activeId, id),
      loadOlder: () => api().loadOlder(activeId),
      /** Retry after a load error. */
      reload: () => api().sync(activeId, "select"),
    };
  }, [activeId]);

  const viewer = channel.viewer;

  const canEdit = useCallback(
    (message: StoreMessage) =>
      viewer !== null &&
      !message.delivery &&
      canEditMessage(
        { userId: viewer.author.id, isGuildOwner: viewer.isGuildOwner },
        { authorId: message.author?.id ?? null },
      ),
    [viewer],
  );

  const canDelete = useCallback(
    (message: StoreMessage) =>
      viewer !== null &&
      !message.delivery &&
      canDeleteMessage(
        { userId: viewer.author.id, isGuildOwner: viewer.isGuildOwner },
        { authorId: message.author?.id ?? null },
      ),
    [viewer],
  );

  return {
    /** Oldest -> newest. Messages with `delivery` set are not confirmed yet. */
    messages: channel.messages,
    /** idle | loading | ready | error - the initial load. */
    status: channel.status,
    error: channel.error,
    errorCode: channel.errorCode,
    hasMore: channel.hasMore,
    loadingOlder: channel.loadingOlder,
    viewer,
    /** ISO time until which the viewer cannot send, or null. */
    timeoutUntil: viewer?.timeoutUntil ?? null,
    /** Realtime connection: idle | connecting | live | disconnected. */
    connection,
    ...actions,
    canEdit,
    canDelete,
  };
}
