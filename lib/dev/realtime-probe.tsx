/* eslint-disable @typescript-eslint/no-explicit-any */
"use client";

/**
 * TEMPORARY smoke-test helper for Stage 3. Delete this file (and the one line
 * that renders it) once realtime has been confirmed - Stage 4 replaces it with
 * the real store and UI.
 *
 * Open the same channel in two tabs: every button press here should log an
 * event in BOTH tabs' browser consoles.
 */

import { useState } from "react";
import {
  deleteMessage,
  editMessage,
  sendMessage,
} from "@/features/messages/Message.actions";
import { useChannelRealtime } from "@/features/messages/use-channel-realtime";
import { buildSendMessageFormData } from "@/features/messages/Message.schema"

export function RealtimeProbe({ channelId }: { channelId: string | null }) {
  const [lastId, setLastId] = useState<string | null>(null);

  const { status, detail } = useChannelRealtime(channelId, {
    onEvent: (event:any) => console.log("[realtime] event", event),
    onLive: (info:any) => console.log("[realtime] live", info),
  });

  async function send() {
    if (!channelId) return;
    const id = crypto.randomUUID();
    const result = await sendMessage(
      buildSendMessageFormData({
        id,
        channelId,
        content: `ping ${new Date().toLocaleTimeString()}`,
      }),
    );
    console.log("[probe] sendMessage ->", result);
    if (result.success) setLastId(id);
  }

  async function editLast() {
    if (!lastId) return;
    const result = await editMessage({
      messageId: lastId,
      content: `edited ${new Date().toLocaleTimeString()}`,
    });
    console.log("[probe] editMessage ->", result);
  }

  async function deleteLast() {
    if (!lastId) return;
    const result = await deleteMessage({ messageId: lastId });
    console.log("[probe] deleteMessage ->", result);
    if (result.success || result.code === "NOT_FOUND") setLastId(null);
  }

  return (
    <div
      style={{
        display: "flex",
        gap: 8,
        alignItems: "center",
        padding: "6px 12px",
        fontSize: 12,
        background: "#1e1f22",
        color: "#dbdee1",
      }}
    >
      <strong>Realtime probe</strong>
      <span>
        status: <b>{status}</b>
        {detail ? ` (${detail})` : ""}
      </span>
      <button type="button" onClick={send} disabled={!channelId}>
        Send ping
      </button>
      <button type="button" onClick={editLast} disabled={!lastId}>
        Edit last
      </button>
      <button type="button" onClick={deleteLast} disabled={!lastId}>
        Delete last
      </button>
    </div>
  );
}
