"use client";

import React from "react";
import { PhoneOff, ScreenShare, Signal, Volume2 } from "lucide-react";

interface VoiceOverlayProps {
  channelName: string;
  serverName: string;
  onDisconnect: () => void;
}

export function VoiceOverlay({
  channelName,
  serverName,
  onDisconnect,
}: VoiceOverlayProps) {
  return (
    <div className="bg-[#111214] border-b border-[#1f2023] px-3 py-2 flex flex-col space-y-1.5 select-none">
      {/* Top Connection Info Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-2 truncate">
          <Signal className="w-4 h-4 text-[#23a55a] shrink-0" />
          <div className="flex flex-col leading-tight truncate">
            <span className="text-xs font-bold text-[#23a55a] hover:underline cursor-pointer truncate">
              Voice Connected
            </span>
            <span className="text-[11px] text-[#949ba4] truncate">
              {channelName} / {serverName}
            </span>
          </div>
        </div>

        {/* Disconnect Call Button */}
        <button
          onClick={onDisconnect}
          className="p-1 rounded text-[#949ba4] hover:text-[#f23f43] hover:bg-[#35373c] transition shrink-0"
          title="Disconnect"
        >
          <PhoneOff className="w-4 h-4" />
        </button>
      </div>

      {/* Voice Control Quick Action Bar */}
      <div className="flex items-center justify-between space-x-1 pt-1">
        <button className="flex-1 py-1 px-2 bg-[#2b2d31] hover:bg-[#35373c] text-[#dbdee1] rounded flex items-center justify-center text-xs font-medium transition space-x-1.5">
          <ScreenShare className="w-3.5 h-3.5" />
          <span>Share Screen</span>
        </button>
        <button className="flex-1 py-1 px-2 bg-[#2b2d31] hover:bg-[#35373c] text-[#dbdee1] rounded flex items-center justify-center text-xs font-medium transition space-x-1.5">
          <Volume2 className="w-3.5 h-3.5" />
          <span>Soundboard</span>
        </button>
      </div>
    </div>
  );
}
