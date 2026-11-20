/* eslint-disable @typescript-eslint/no-explicit-any */
"use client";

/**
 * TEMPORARY smoke-test helper for Stage 4. Delete this file (and the one line
 * that renders it) when you are done; it is deliberately ugly and unstyled.
 *
 * It uses the real `useChannelMessages` hook, so everything you click here goes
 * through the real store, server actions, database and Supabase Realtime.
 */

import { useState } from "react";
import { useChannelMessages } from "../../features/messages/useChannelMessages";
import type { Outcome, SendOutcome } from "../../store/message-store";

export function MessagesProbe({ channelId }: { channelId: string | null }) {
  const chat = useChannelMessages(channelId);
  const [text, setText] = useState("");
  const [notice, setNotice] = useState<string | null>(null);

  async function run(request: Promise<Outcome | SendOutcome>) {
    const result = await request;
    setNotice(result.ok ? null : result.error);
  }

  return (
    <div
      style={{
        padding: 12,
        fontSize: 13,
        color: "#dbdee1",
        background: "#1e1f22",
        borderBottom: "1px solid #3f4147",
      }}
    >
      <div>
        <strong>Messages probe</strong> | load: <b>{chat.status}</b>
        {chat.error ? ` (${chat.error})` : ""} | realtime:{" "}
        <b>{chat.connection.status}</b>
        {chat.connection.detail ? ` (${chat.connection.detail})` : ""} | older
        messages: <b>{String(chat.hasMore)}</b> | you:{" "}
        <b>{chat.viewer?.author.username ?? "-"}</b>
        {chat.viewer?.isGuildOwner ? " (owner)" : ""}
        {chat.timeoutUntil ? ` | timed out until ${chat.timeoutUntil}` : ""}
      </div>

      {notice ? <div style={{ color: "#f23f42" }}>{notice}</div> : null}

      <div style={{ margin: "6px 0" }}>
        {chat.status === "error" ? (
          <button type="button" onClick={() => void chat.reload()}>
            Reload
          </button>
        ) : null}
        {chat.hasMore ? (
          <button
            type="button"
            disabled={chat.loadingOlder}
            onClick={() => void run(chat.loadOlder())}
          >
            {chat.loadingOlder ? "Loading..." : "Load older"}
          </button>
        ) : null}
      </div>

      <ul
        style={{
          listStyle: "none",
          padding: 0,
          margin: "6px 0",
          maxHeight: 320,
          overflowY: "auto",
        }}
      >
        {chat.messages.map((message:any) => (
          <li
            key={message.id}
            style={{ opacity: message.delivery === "sending" ? 0.5 : 1 }}
          >
            <b>
              {message.author?.displayName ??
                message.author?.username ??
                "unknown"}
            </b>
            : {message.content ?? <i>(attachment only)</i>}
            {message.editedAt ? " (edited)" : ""}
            {message.delivery === "sending" ? " - sending..." : ""}
            {message.delivery === "failed"
              ? ` - FAILED: ${message.deliveryError ?? "unknown error"}`
              : ""}{" "}
            {chat.canEdit(message) ? (
              <button
                type="button"
                onClick={() => {
                  const next = window.prompt(
                    "Edit message",
                    message.content ?? "",
                  );
                  if (next !== null) void run(chat.edit(message.id, next));
                }}
              >
                Edit
              </button>
            ) : null}
            {chat.canDelete(message) ? (
              <button
                type="button"
                onClick={() => void run(chat.remove(message.id))}
              >
                Delete
              </button>
            ) : null}
            {message.delivery === "failed" ? (
              <>
                <button
                  type="button"
                  onClick={() => void run(chat.retry(message.id))}
                >
                  Retry
                </button>
                <button type="button" onClick={() => chat.discard(message.id)}>
                  Discard
                </button>
              </>
            ) : null}
          </li>
        ))}
      </ul>

      <form
        onSubmit={async (event: { preventDefault(): void }) => {
          event.preventDefault();
          const value = text;
          setText("");
          await run(chat.send({ content: value }));
        }}
      >
        <input
          value={text}
          onChange={(event: { target: { value: string } }) =>
            setText(event.target.value)
          }
          placeholder={
            chat.timeoutUntil ? "You are timed out" : "Type a message"
          }
          disabled={chat.status !== "ready"}
          style={{ width: 320 }}
        />{" "}
        <button type="submit" disabled={chat.status !== "ready"}>
          Send
        </button>
      </form>
    </div>
  );
}
