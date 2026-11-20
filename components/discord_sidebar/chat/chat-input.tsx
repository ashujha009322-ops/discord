"use client";

import React, { useState } from "react";
import { PlusCircle, Gift, Image, Smile, Send, X } from "lucide-react";

interface ChatInputProps {
  placeholder: string;
  disabled?: boolean;
  error?: string | null;
  onDismissError?: () => void;
  onSendMessage: (text: string) => Promise<void> | void;
}

export function ChatInput({
  placeholder,
  disabled = false,
  error = null,
  onDismissError,
  onSendMessage,
}: ChatInputProps) {
  const [text, setText] = useState("");

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const trimmed = text.trim();
    if (disabled || !trimmed) return;

    setText("");
    void onSendMessage(trimmed);
  };

  return (
    <div className="px-4 pb-6 pt-1 bg-[#313338]">
      {error && (
        <div
          role="alert"
          className="mb-2 px-3 py-1.5 rounded bg-[#f23f42]/15 border border-[#f23f42]/40 text-xs text-[#f23f42] flex items-center justify-between"
        >
          <span>{error}</span>
          {onDismissError && (
            <button
              type="button"
              onClick={onDismissError}
              aria-label="Dismiss error"
              className="hover:text-white transition ml-2"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          )}
        </div>
      )}

      <form
        onSubmit={handleSubmit}
        className={`bg-[#383a40] rounded-lg px-4 py-2.5 flex items-center space-x-3 text-[#dbdee1] ${
          disabled ? "opacity-60 cursor-not-allowed" : ""
        }`}
      >
        {/* Attachment Upload Button */}
        <button
          type="button"
          disabled={disabled}
          className="text-[#b5bac1] hover:text-white transition disabled:pointer-events-none"
          title="Upload File"
          aria-label="Upload File"
        >
          <PlusCircle className="w-5 h-5" />
        </button>

        {/* Message Input */}
        <input
          type="text"
          value={text}
          disabled={disabled}
          onChange={(e) => setText(e.target.value)}
          placeholder={placeholder}
          className="bg-transparent flex-1 focus:outline-none text-sm text-white placeholder:text-[#80848e] disabled:cursor-not-allowed"
        />

        {/* Action Icon Group */}
        <div className="flex items-center space-x-3 text-[#b5bac1]">
          <button
            type="button"
            disabled={disabled}
            aria-label="Send a gift"
            className="hover:text-white transition hidden sm:block disabled:pointer-events-none"
          >
            <Gift className="w-5 h-5" />
          </button>
          <button
            type="button"
            disabled={disabled}
            aria-label="Add image"
            className="hover:text-white transition hidden sm:block disabled:pointer-events-none"
          >
            <Image className="w-5 h-5" />
          </button>
          <button
            type="button"
            disabled={disabled}
            aria-label="Choose emoji"
            className="hover:text-white transition disabled:pointer-events-none"
          >
            <Smile className="w-5 h-5" />
          </button>
          {text.trim() && !disabled && (
            <button
              type="submit"
              aria-label="Send message"
              className="text-[#5865f2] hover:text-white transition"
            >
              <Send className="w-5 h-5 fill-current" />
            </button>
          )}
        </div>
      </form>
    </div>
  );
}
