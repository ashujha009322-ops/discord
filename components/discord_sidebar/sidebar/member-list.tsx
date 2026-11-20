"use client";

import React from "react";
import { ServerMember } from "../types";
import { cn } from "@/lib/utils";

interface MemberListProps {
  members: ServerMember[];
}

export function MemberList({ members }: MemberListProps) {
  const statusColors = {
    online: "bg-[#23a55a]",
    idle: "bg-[#f0b232]",
    dnd: "bg-[#f23f43]",
    offline: "bg-[#80848e]",
  };

  const onlineMembers = members.filter((m) => m.user.status !== "offline");
  const offlineMembers = members.filter((m) => m.user.status === "offline");

  return (
    <aside className="w-60 bg-[#2b2d31] flex flex-col shrink-0 border-l border-[#1f2023] px-3 py-4 select-none overflow-y-auto no-scrollbar">
      {/* Online Group */}
      <div className="space-y-1 mb-6">
        <h3 className="text-xs font-bold text-[#949ba4] tracking-wider uppercase px-1 mb-2">
          Online — {onlineMembers.length}
        </h3>
        {onlineMembers.map((member) => (
          <button
            key={member.user.id}
            className="w-full flex items-center px-2 py-1.5 rounded hover:bg-[#35373c] transition group"
          >
            <div className="relative mr-3 shrink-0">
              <img
                src={member.user.avatarUrl}
                alt={member.user.name}
                className="w-8 h-8 rounded-full object-cover"
              />
              <span
                className={cn(
                  "absolute -bottom-0.5 -right-0.5 w-3 h-3 rounded-full border-[2.5px] border-[#2b2d31]",
                  statusColors[member.user.status],
                )}
              />
            </div>
            <div className="flex flex-col text-left truncate">
              <span className="text-sm font-medium text-[#dbdee1] group-hover:text-white truncate">
                {member.user.name}
              </span>
              {member.user.customStatus && (
                <span className="text-[11px] text-[#949ba4] truncate">
                  {member.user.customStatus}
                </span>
              )}
            </div>
          </button>
        ))}
      </div>

      {/* Offline Group */}
      {offlineMembers.length > 0 && (
        <div className="space-y-1">
          <h3 className="text-xs font-bold text-[#949ba4] tracking-wider uppercase px-1 mb-2">
            Offline — {offlineMembers.length}
          </h3>
          {offlineMembers.map((member) => (
            <button
              key={member.user.id}
              className="w-full flex items-center px-2 py-1.5 rounded hover:bg-[#35373c] transition group opacity-60 hover:opacity-100"
            >
              <div className="relative mr-3 shrink-0">
                <img
                  src={member.user.avatarUrl}
                  alt={member.user.name}
                  className="w-8 h-8 rounded-full object-cover"
                />
                <span className="absolute -bottom-0.5 -right-0.5 w-3 h-3 rounded-full border-[2.5px] border-[#2b2d31] bg-[#80848e]" />
              </div>
              <span className="text-sm font-medium text-[#dbdee1] group-hover:text-white truncate">
                {member.user.name}
              </span>
            </button>
          ))}
        </div>
      )}
    </aside>
  );
}
