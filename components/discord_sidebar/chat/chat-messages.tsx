/* eslint-disable react-hooks/set-state-in-effect */
/* eslint-disable @typescript-eslint/no-explicit-any */
"use client";

import React, { useEffect, useRef, useState } from "react";
import { Pencil, Trash2, RotateCcw, Loader2, AlertCircle } from "lucide-react";

export interface ChatMessagesProps {
  messages: any[];
  channelName: string;
  status: string;
  error: string | null;
  hasMore: boolean;
  loadingOlder: boolean;
  onLoadOlder: () => Promise<void>;
  onReload: () => void;
  canEdit: (message: any) => boolean;
  canDelete: (message: any) => boolean;
  onEdit: (messageId: string, nextContent: string) => Promise<void>;
  onDelete: (messageId: string) => Promise<void>;
  onRetry: (messageId: string) => Promise<void>;
  onDiscard: (messageId: string) => void;
}

function formatTimestamp(raw?: string | Date | null): string {
  if (!raw) return "";
  const date = raw instanceof Date ? raw : new Date(raw);
  if (Number.isNaN(date.getTime())) return String(raw);
  return date.toLocaleTimeString([], { hour: "numeric", minute: "2-digit" });
}

export function ChatMessages({
  messages,
  channelName,
  status,
  error,
  hasMore,
  loadingOlder,
  onLoadOlder,
  onReload,
  canEdit,
  canDelete,
  onEdit,
  onDelete,
  onRetry,
  onDiscard,
}: ChatMessagesProps) {
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editDraft, setEditDraft] = useState("");
  const [savingEdit, setSavingEdit] = useState(false);
  const bottomRef = useRef<HTMLDivElement | null>(null);

  const lastMessageId =
    messages.length > 0 ? messages[messages.length - 1]?.id : null;

  // Scroll to bottom when switching channels or when a new message arrives at the tail
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [lastMessageId]);

  // Reset inline edit state if the active channel changes
  useEffect(() => {
    setEditingId(null);
    setEditDraft("");
  }, [channelName]);

  const startEditing = (msg: any) => {
    setEditingId(msg.id);
    setEditDraft(msg.content ?? "");
  };

  const cancelEditing = () => {
    setEditingId(null);
    setEditDraft("");
  };

  const submitEdit = async (messageId: string) => {
    const trimmed = editDraft.trim();
    if (!trimmed) return;
    setSavingEdit(true);
    try {
      await onEdit(messageId, trimmed);
      setEditingId(null);
      setEditDraft("");
    } finally {
      setSavingEdit(false);
    }
  };

  return (
    <div className="flex-1 overflow-y-auto px-4 py-6 space-y-4 no-scrollbar">
      {/* Channel Header Welcome Card (shown at the beginning of channel history) */}
      {!hasMore && status !== "loading" && (
        <>
          <div className="mb-6 space-y-2">
            <div className="w-16 h-16 rounded-full bg-[#404249] flex items-center justify-center text-white text-3xl font-bold">
              #
            </div>
            <h1 className="text-3xl font-bold text-white">
              Welcome to #{channelName}!
            </h1>
            <p className="text-sm text-[#949ba4]">
              This is the start of the #{channelName} channel.
            </p>
          </div>

          <div className="h-[1px] bg-[#3f4147] my-4" />
        </>
      )}

      {/* Load Older Pagination Trigger */}
      {hasMore && (
        <div className="flex justify-center pb-2">
          <button
            type="button"
            disabled={loadingOlder}
            onClick={() => void onLoadOlder()}
            className="text-xs font-medium bg-[#2b2d31] hover:bg-[#35373c] text-[#dbdee1] px-3 py-1.5 rounded-md border border-[#1f2023] transition disabled:opacity-50 flex items-center gap-1.5"
          >
            {loadingOlder && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
            {loadingOlder ? "Loading older messages..." : "Load older messages"}
          </button>
        </div>
      )}

      {/* Initial Channel Load State */}
      {status === "loading" && messages.length === 0 && (
        <div className="flex items-center justify-center py-12 text-sm text-[#949ba4] gap-2">
          <Loader2 className="w-4 h-4 animate-spin" />
          <span>Loading messages...</span>
        </div>
      )}

      {/* Channel Load Error Banner */}
      {status === "error" && (
        <div
          role="alert"
          className="bg-[#f23f42]/10 border border-[#f23f42]/40 rounded-md p-3 flex items-center justify-between text-sm text-[#f23f42]"
        >
          <div className="flex items-center gap-2">
            <AlertCircle className="w-4 h-4 shrink-0" />
            <span>{error || "Failed to load messages."}</span>
          </div>
          <button
            type="button"
            onClick={onReload}
            className="px-2.5 py-1 bg-[#f23f42] text-white text-xs font-semibold rounded hover:bg-[#d83538] transition"
          >
            Reload
          </button>
        </div>
      )}

      {/* Message Feed */}
      <div className="space-y-4">
        {messages.map((msg) => {
          const displayName =
            msg.author?.displayName ?? msg.author?.username ?? "Unknown";
          const avatarUrl =
            msg.author?.avatarUrl ||
            `https://api.dicebear.com/7.x/avataaars/svg?seed=${encodeURIComponent(
              displayName,
            )}`;

          const isSending = msg.delivery === "sending";
          const isFailed = msg.delivery === "failed";
          const isEditing = editingId === msg.id;
          const allowEdit = canEdit(msg) && !isSending && !isFailed;
          const allowDelete = canDelete(msg) && !isSending && !isFailed;

          return (
            <div
              key={msg.id}
              className={`group relative flex items-start space-x-4 hover:bg-[#2e3035] -mx-4 px-4 py-1.5 rounded transition ${
                isSending ? "opacity-50" : ""
              }`}
            >
              {/* User Avatar */}
              <img
                src={avatarUrl}
                alt={displayName}
                className="w-10 h-10 rounded-full object-cover shrink-0 mt-0.5 bg-[#1e1f22]"
              />

              {/* Message Body */}
              <div className="flex-1 min-w-0">
                <div className="flex items-center space-x-2">
                  <span className="font-semibold text-white text-sm hover:underline cursor-pointer">
                    {displayName}
                  </span>
                  <span className="text-[11px] text-[#949ba4]">
                    {formatTimestamp(msg.createdAt ?? msg.timestamp)}
                  </span>
                  {isSending && (
                    <span className="text-[11px] text-[#949ba4] italic">
                      Sending...
                    </span>
                  )}
                </div>

                {/* Inline Edit Input vs Message Content */}
                {isEditing ? (
                  <div className="mt-1 space-y-1.5">
                    <input
                      type="text"
                      value={editDraft}
                      disabled={savingEdit}
                      onChange={(e) => setEditDraft(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === "Enter") {
                          e.preventDefault();
                          void submitEdit(msg.id);
                        } else if (e.key === "Escape") {
                          cancelEditing();
                        }
                      }}
                      autoFocus
                      className="w-full bg-[#383a40] text-sm text-white rounded px-3 py-1.5 focus:outline-none ring-1 ring-[#5865f2]"
                    />
                    <div className="flex items-center gap-1.5 text-xs text-[#949ba4]">
                      <span>escape to</span>
                      <button
                        type="button"
                        onClick={cancelEditing}
                        className="text-[#00a8fc] hover:underline"
                      >
                        cancel
                      </button>
                      <span>• enter to</span>
                      <button
                        type="button"
                        disabled={savingEdit}
                        onClick={() => void submitEdit(msg.id)}
                        className="text-[#00a8fc] hover:underline"
                      >
                        save
                      </button>
                    </div>
                  </div>
                ) : (
                  <p
                    className={`text-sm leading-relaxed break-words mt-0.5 ${
                      isFailed ? "text-[#f23f42]" : "text-[#dbdee1]"
                    }`}
                  >
                    {msg.content ?? (
                      <span className="italic text-[#949ba4]">
                        (attachment only)
                      </span>
                    )}
                    {msg.editedAt && (
                      <span className="text-[10px] text-[#949ba4] ml-1.5">
                        (edited)
                      </span>
                    )}
                  </p>
                )}

                {/* Failed Delivery Recovery Controls */}
                {isFailed && (
                  <div className="mt-1 flex items-center gap-3 text-xs text-[#f23f42]">
                    <span>
                      Failed to send: {msg.deliveryError ?? "Unknown error"}
                    </span>
                    <button
                      type="button"
                      onClick={() => void onRetry(msg.id)}
                      className="inline-flex items-center gap-1 text-white bg-[#5865f2] hover:bg-[#4752c4] px-2 py-0.5 rounded transition"
                    >
                      <RotateCcw className="w-3 h-3" />
                      Retry
                    </button>
                    <button
                      type="button"
                      onClick={() => onDiscard(msg.id)}
                      className="text-[#949ba4] hover:text-white underline"
                    >
                      Discard
                    </button>
                  </div>
                )}

                {/* Attachments (if present) */}
                {msg.attachments && msg.attachments.length > 0 && (
                  <div className="mt-2 flex flex-wrap gap-2">
                    {msg.attachments.map((att: any, idx: number) => (
                      <img
                        key={att.id ?? idx}
                        src={att.url}
                        alt={att.filename ?? "Attachment"}
                        className="max-w-xs max-h-60 rounded-md object-cover border border-[#1f2023]"
                      />
                    ))}
                  </div>
                )}
              </div>

              {/* Hover Action Bar */}
              {!isEditing && (allowEdit || allowDelete) && (
                <div className="absolute right-4 -top-3 hidden group-hover:flex items-center bg-[#313338] border border-[#232428] rounded-md shadow-md text-[#b5bac1]">
                  {allowEdit && (
                    <button
                      type="button"
                      title="Edit Message"
                      aria-label="Edit Message"
                      onClick={() => startEditing(msg)}
                      className="p-1.5 hover:bg-[#35373c] hover:text-white transition rounded-l-md"
                    >
                      <Pencil className="w-4 h-4" />
                    </button>
                  )}
                  {allowDelete && (
                    <button
                      type="button"
                      title="Delete Message"
                      aria-label="Delete Message"
                      onClick={() => void onDelete(msg.id)}
                      className="p-1.5 hover:bg-[#35373c] hover:text-[#f23f42] transition rounded-r-md"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  )}
                </div>
              )}
            </div>
          );
        })}
      </div>

      <div ref={bottomRef} />
    </div>
  );
}
