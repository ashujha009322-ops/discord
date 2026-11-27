"use client";

import React, { useEffect, useState } from "react";
import { Crown } from "lucide-react";
import { useMemberStore } from "@/store/use-member-store";
import { GuildMemberDTO } from "@/features/memberList/member";
import { intColorToHex } from "@/features/memberList/storage";
import { cn } from "@/lib/utils";
import { MemberActionDropdown } from "../../member-list/member-action-dropdown";

interface MemberListProps {
  guildId: string;
}

function MemberRow({ member }: { member: GuildMemberDTO }) {
  const [menuOpen, setMenuOpen] = useState(false);
  const viewerPermissions = useMemberStore((s) => s.viewerPermissions);
  const openProfileModal = useMemberStore((s) => s.openProfileModal);

  const topRole = member.roles.find((r) => r.color && r.color !== 0);
  const nameColor = topRole ? intColorToHex(topRole.color) : undefined;

  const initials = member.effectiveName.slice(0, 2).toUpperCase();

  return (
    <div
      role="button"
      tabIndex={0}
      onClick={() => openProfileModal(member.guildId, member.userId)}
      onKeyDown={(e) => {
        if (e.key === "Enter" || e.key === " ") {
          e.preventDefault();
          openProfileModal(member.guildId, member.userId);
        }
      }}
      className={cn(
        "group w-full flex items-center px-2 py-1.5 rounded cursor-pointer transition",
        menuOpen ? "bg-[#35373c]" : "hover:bg-[#35373c]",
      )}
    >
      {/* Avatar */}
      <div className="relative mr-3 shrink-0">
        {member.avatarUrl ? (
          <img
            src={member.avatarUrl}
            alt={member.effectiveName}
            className="w-8 h-8 rounded-full object-cover"
          />
        ) : (
          <div className="w-8 h-8 rounded-full bg-[#5865f2] text-white text-xs font-semibold flex items-center justify-center">
            {initials}
          </div>
        )}
      </div>

      {/* Name + Badges */}
      <div className="flex items-center gap-1.5 min-w-0 flex-1 pr-1">
        <span
          style={nameColor ? { color: nameColor } : undefined}
          className={cn(
            "text-sm font-medium truncate",
            !nameColor && "text-[#dbdee1] group-hover:text-white",
          )}
        >
          {member.effectiveName}
        </span>

        {member.isOwner && (
          <Crown
            className="w-3.5 h-3.5 text-[#f0b232] shrink-0"
            aria-label="Server Owner"
          />
        )}

        {member.isBot && (
          <span className="px-1 py-0.2 text-[10px] font-bold uppercase rounded bg-[#5865f2] text-white shrink-0 leading-tight">
            Bot
          </span>
        )}
      </div>

      {/* Hover ChevronDown Dropdown */}
      <MemberActionDropdown
        member={member}
        viewerPermissions={viewerPermissions}
        open={menuOpen}
        onOpenChange={setMenuOpen}
      />
    </div>
  );
}

export function MemberList({ guildId }: MemberListProps) {
  const members = useMemberStore((s) => s.members);
  const isLoading = useMemberStore((s) => s.isLoadingMembers);
  const error = useMemberStore((s) => s.membersError);
  const fetchGuildMembers = useMemberStore((s) => s.fetchGuildMembers);

  useEffect(() => {
    if (guildId) {
      fetchGuildMembers(guildId);
    }
  }, [guildId, fetchGuildMembers]);

  return (
    <aside className="w-60 bg-[#2b2d31] flex flex-col shrink-0 border-l border-[#1f2023] px-3 py-4 select-none overflow-y-auto no-scrollbar">
      <div className="space-y-1">
        <h3 className="text-xs font-bold text-[#949ba4] tracking-wider uppercase px-1 mb-2">
          Members — {members.length}
        </h3>

        {isLoading && members.length === 0 && (
          <div className="space-y-2 px-1">
            {Array.from({ length: 6 }).map((_, idx) => (
              <div
                key={idx}
                className="flex items-center gap-3 py-1.5 animate-pulse"
              >
                <div className="w-8 h-8 rounded-full bg-[#35373c]" />
                <div className="h-3.5 w-28 rounded bg-[#35373c]" />
              </div>
            ))}
          </div>
        )}

        {error && (
          <div className="px-2 py-3 text-xs text-[#f23f43] bg-[#f23f43]/10 rounded">
            {error}
          </div>
        )}

        {!isLoading &&
          !error &&
          members.map((member) => (
            <MemberRow key={member.userId} member={member} />
          ))}
      </div>
    </aside>
  );
}
