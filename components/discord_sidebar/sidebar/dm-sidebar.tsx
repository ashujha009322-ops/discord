"use client";

import React from "react";
import { DirectMessageItem } from "../types";
import {
  Users,
  Sparkles,
  ShoppingBag,
  Trophy,
  Plus,
  Search,
} from "lucide-react";
import { cn } from "@/lib/utils";

interface DMSidebarProps {
  dms: DirectMessageItem[];
  activeDmId: string | null;
  onSelectDm: (id: string) => void;
}

export function DMSidebar({ dms, activeDmId, onSelectDm }: DMSidebarProps) {
  const statusColors = {
    online: "bg-[#23a55a]",
    idle: "bg-[#f0b232]",
    dnd: "bg-[#f23f43]",
    offline: "bg-[#80848e]",
  };

  return (
    <div className="flex-1 flex flex-col min-h-0 bg-[#2b2d31] text-gray-400 select-none">
      {/* Top Search Button */}
      <div className="h-12 px-3 flex items-center border-b border-[#1f2023] shadow-sm">
        <button className="w-full h-7 bg-[#1e1f22] text-[#949ba4] hover:text-gray-200 text-xs px-2 rounded flex items-center justify-between transition">
          <span className="font-medium truncate">
            Find or start a conversation
          </span>
        </button>
      </div>

      <div className="flex-1 overflow-y-auto px-2 py-3 space-y-4 no-scrollbar">
        {/* Main Navigation Items */}
        <div className="space-y-0.5">
          <button className="w-full flex items-center px-3 py-2.5 rounded text-[#dbdee1] hover:bg-[#35373c] hover:text-[#f2f3f5] group transition">
            <Users className="w-5 h-5 mr-4 text-[#949ba4] group-hover:text-white" />
            <span className="font-medium text-sm">Friends</span>
          </button>

          <button className="w-full flex items-center justify-between px-3 py-2.5 rounded text-[#dbdee1] hover:bg-[#35373c] hover:text-[#f2f3f5] group transition">
            <div className="flex items-center">
              <Sparkles className="w-5 h-5 mr-4 text-[#949ba4] group-hover:text-white" />
              <span className="font-medium text-sm">Nitro</span>
            </div>
            <span className="bg-[#5865f2] text-white text-[10px] font-bold px-1.5 py-0.5 rounded-full flex items-center gap-1">
              <span className="w-1.5 h-1.5 rounded-full bg-white" /> DISCOUNT
            </span>
          </button>

          <button className="w-full flex items-center justify-between px-3 py-2.5 rounded text-[#dbdee1] hover:bg-[#35373c] hover:text-[#f2f3f5] group transition">
            <div className="flex items-center">
              <ShoppingBag className="w-5 h-5 mr-4 text-[#949ba4] group-hover:text-white" />
              <span className="font-medium text-sm">Shop</span>
            </div>
            <span className="bg-[#2b2d31] border border-[#f23f43] text-white text-[10px] font-bold px-1.5 py-0.5 rounded flex items-center">
              🏷️ PROMO
            </span>
          </button>

          <button className="w-full flex items-center px-3 py-2.5 rounded text-[#dbdee1] hover:bg-[#35373c] hover:text-[#f2f3f5] group transition">
            <Trophy className="w-5 h-5 mr-4 text-[#949ba4] group-hover:text-white" />
            <span className="font-medium text-sm">Quests</span>
          </button>
        </div>

        {/* Direct Messages Section */}
        <div>
          <div className="flex items-center justify-between px-2 mb-1 group">
            <span className="text-xs font-bold text-[#949ba4] tracking-wider uppercase group-hover:text-gray-200">
              Direct Messages
            </span>
            <button className="text-[#949ba4] hover:text-white transition">
              <Plus className="w-4 h-4" />
            </button>
          </div>

          <div className="space-y-0.5">
            {dms.map((dm) => {
              const isActive = activeDmId === dm.id;

              return (
                <button
                  key={dm.id}
                  onClick={() => onSelectDm(dm.id)}
                  className={cn(
                    "w-full flex items-center px-2 py-2 rounded-md transition group",
                    isActive
                      ? "bg-[#404249] text-white"
                      : "hover:bg-[#35373c] text-[#949ba4] hover:text-[#dbdee1]",
                  )}
                >
                  <div className="relative mr-3 shrink-0">
                    <img
                      src={dm.user.avatarUrl}
                      alt={dm.user.name}
                      className="w-8 h-8 rounded-full object-cover"
                    />
                    <span
                      className={cn(
                        "absolute -bottom-0.5 -right-0.5 w-3 h-3 rounded-full border-[2.5px] border-[#2b2d31]",
                        statusColors[dm.user.status],
                      )}
                    />
                  </div>

                  <div className="flex flex-col text-left truncate min-w-0 flex-1">
                    <div className="flex items-center space-x-1.5">
                      <span
                        className={cn(
                          "text-sm font-medium truncate",
                          isActive ? "text-white" : "text-[#dbdee1]",
                        )}
                      >
                        {dm.user.name}
                      </span>
                      {dm.user.badge && (
                        <span className="bg-[#23a55a] text-black text-[9px] font-extrabold px-1 py-0.2 rounded">
                          {dm.user.badge}
                        </span>
                      )}
                    </div>
                    {dm.user.customStatus && (
                      <span className="text-[11px] text-[#949ba4] truncate leading-tight">
                        {dm.user.customStatus}
                      </span>
                    )}
                  </div>
                </button>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}
