"use client";

import { useStore } from "zustand";
import {
  deleteMessage,
  editMessage,
  getMessages,
  sendMessage,
} from "../features/messages/Message.actions";
import { newMessageId } from "../features/messages/newMessageId";
import { createMessageStore, type MessageStoreState } from "./message-store";

/**
 * The one message store for the whole app: bound to the real server actions.
 * (The factory lives in message-store.ts so tests can build one with fakes.)
 */
export const messageStore = createMessageStore({
  sendMessage,
  getMessages,
  editMessage,
  deleteMessage,
  newId: newMessageId,
  now: () => Date.now(),
});

/**
 * Selector hook. Selectors MUST return a stable reference for unchanged data
 * (pick a field or an existing object; never build a new array/object inside
 * the selector), otherwise React re-renders forever.
 */
export function useMessageStore<T>(
  selector: (state: MessageStoreState) => T,
): T {
  return useStore(messageStore, selector);
}
