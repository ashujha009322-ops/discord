import "server-only";

import { after } from "next/server";
// ASSUMPTION: this is where your service-role client lives (the file that
// exports `supabaseAdmin`). Adjust this one import if it is somewhere else.
import { supabaseAdmin } from "@/lib/supabase/client";
import {
  MESSAGE_REALTIME_EVENTS,
  REALTIME_BROADCAST_TIMEOUT_MS,
  channelTopic,
} from "./Constants";
import type { MessageDTO } from "./Types";

/**
 * Publishes one event to `channel:<channelId>` over the Realtime REST API.
 *
 * - `httpSend` (not `send`): always HTTP, never opens a WebSocket from the
 *   server, so serverless invocations don't pile up connections.
 * - `private: true` MUST match the clients' channel config. A private
 *   channel only receives private broadcasts; a public one would be dropped
 *   silently.
 * - NEVER throws. By the time we get here the message is already committed to
 *   the database, so a failed broadcast must not turn a successful send into
 *   an error. Clients recover through the resync-on-reconnect path.
 */
async function broadcast(
  channelId: string,
  event: string,
  payload: Record<string, unknown>,
): Promise<void> {
  let channel: ReturnType<typeof supabaseAdmin.channel> | null = null;

  try {
    channel = supabaseAdmin.channel(channelTopic(channelId), {
      config: { private: true },
    });

    const result = await channel.httpSend(event, payload, {
      timeout: REALTIME_BROADCAST_TIMEOUT_MS,
    });

    if (!result.success) {
      console.error("[messages] realtime broadcast rejected", {
        event,
        channelId,
        status: result.status,
        error: result.error,
      });
    }
  } catch (error) {
    console.error("[messages] realtime broadcast failed", {
      event,
      channelId,
      error,
    });
  } finally {
    // httpSend never subscribes, but the client still tracks the channel
    // object; remove it so they don't accumulate in a long-lived server.
    if (channel) {
      try {
        await supabaseAdmin.removeChannel(channel);
      } catch {
        // nothing useful to do
      }
    }
  }
}

/**
 * Runs a broadcast after the Server Action response has been flushed to the
 * client, while keeping serverless runtimes alive until the request finishes.
 * Falls back to fire-and-forget when invoked outside a Next.js request scope.
 */
function runAfterResponse(task: () => Promise<void>): void {
  try {
    after(task);
  } catch {
    void task();
  }
}

export function broadcastMessageCreated(message: MessageDTO): Promise<void> {
  return broadcast(message.channelId, MESSAGE_REALTIME_EVENTS.created, {
    message,
  });
}

export function broadcastMessageUpdated(message: MessageDTO): Promise<void> {
  return broadcast(message.channelId, MESSAGE_REALTIME_EVENTS.updated, {
    message,
  });
}

export function broadcastMessageDeleted(deleted: {
  id: string;
  channelId: string;
}): Promise<void> {
  return broadcast(deleted.channelId, MESSAGE_REALTIME_EVENTS.deleted, {
    id: deleted.id,
    channelId: deleted.channelId,
  });
}

export function scheduleBroadcastMessageCreated(message: MessageDTO): void {
  runAfterResponse(() => broadcastMessageCreated(message));
}

export function scheduleBroadcastMessageUpdated(message: MessageDTO): void {
  runAfterResponse(() => broadcastMessageUpdated(message));
}

export function scheduleBroadcastMessageDeleted(deleted: {
  id: string;
  channelId: string;
}): void {
  runAfterResponse(() => broadcastMessageDeleted(deleted));
}
