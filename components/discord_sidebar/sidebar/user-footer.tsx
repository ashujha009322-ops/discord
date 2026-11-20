"use client";

import React, { useState } from "react";
import { User } from "../types";
import { Mic, MicOff, Headphones, Settings, ChevronDown } from "lucide-react";
import { cn } from "@/lib/utils";

interface UserFooterProps {
  user: User;
}

export function UserFooter({ user }: UserFooterProps) {
  const [isMuted, setIsMuted] = useState(false);
  const [isDeafened, setIsDeafened] = useState(false);

  const statusColors = {
    online: "bg-[#23a55a]",
    idle: "bg-[#f0b232]",
    dnd: "bg-[#f23f43]",
    offline: "bg-[#80848e]",
  };

  return (
    <footer className="h-[52px] bg-[#232428] px-2 flex items-center justify-between text-gray-300 select-none">
      {/* Profile Button */}
      <button className="flex items-center space-x-2 p-1 rounded-md hover:bg-[#35373c] transition group max-w-[120px] shrink truncate">
        <div className="relative shrink-0">
          <img
            src={user.avatarUrl}
            alt={user.name}
            className="w-8 h-8 rounded-full object-cover"
          />
          {/* Status Badge */}
          <span
            className={cn(
              "absolute -bottom-0.5 -right-0.5 w-3 h-3 rounded-full border-[2.5px] border-[#232428]",
              statusColors[user.status],
            )}
          />
        </div>
        <div className="flex flex-col text-left truncate leading-tight">
          <span className="text-sm font-semibold text-white truncate leading-none">
            {user.name}
          </span>
          <span className="text-[11px] text-gray-400 truncate mt-0.5">
            {user.username}
          </span>
        </div>
      </button>

      {/* Control Action Buttons */}
      <div className="flex items-center space-x-0.5">
        {/* Mute Button with Dropdown arrow like screenshot */}
        <div className="flex items-center rounded-md hover:bg-[#35373c]">
          <button
            onClick={() => setIsMuted(!isMuted)}
            className="p-1.5 text-gray-300 hover:text-white transition"
            title={isMuted ? "Unmute" : "Mute"}
          >
            {isMuted ? (
              <MicOff className="w-4 h-4 text-[#f23f43]" />
            ) : (
              <Mic className="w-4 h-4" />
            )}
          </button>
          <button className="py-1.5 pr-1 pl-0 text-gray-400 hover:text-white">
            <ChevronDown className="w-3 h-3" />
          </button>
        </div>

        {/* Deafen Button with Dropdown arrow */}
        <div className="flex items-center rounded-md hover:bg-[#35373c]">
          <button
            onClick={() => setIsDeafened(!isDeafened)}
            className="p-1.5 text-gray-300 hover:text-white transition"
            title={isDeafened ? "Undeafen" : "Deafen"}
          >
            <Headphones
              className={cn("w-4 h-4", isDeafened && "text-[#f23f43]")}
            />
          </button>
          <button className="py-1.5 pr-1 pl-0 text-gray-400 hover:text-white">
            <ChevronDown className="w-3 h-3" />
          </button>
        </div>

        {/* User Settings Button */}
        <button
          className="p-1.5 rounded-md text-gray-300 hover:text-white hover:bg-[#35373c] transition"
          title="User Settings"
        >
          <Settings className="w-4 h-4" />
        </button>
      </div>
    </footer>
  );
}
