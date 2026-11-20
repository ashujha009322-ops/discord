"use client";

import React from "react";
import { useParams } from "next/navigation";
import {
  ChevronDown,
  UserPlus,
  Settings,
  PlusCircle,
  FolderPlus,
  CalendarPlus,
  LayoutGrid,
  Bell,
  Shield,
  Pencil,
  EyeOff,
  Sparkles,
} from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { normalizeChannelParam } from "../../features/invite/describeInviteExpiry";
import { useModal } from "@/store/use-modal-store";

// CONFIRM: must match the dynamic segment name in your channel route,
// e.g. /servers/[guildId]/channels/[channelId].
const CHANNEL_PARAM = "channelId";

interface ServerHeaderDropdownProps {
  server: {
    id: string;
    name: string;
    isOwner?: boolean;
  };
}

export function ServerHeaderDropdown({ server }: ServerHeaderDropdownProps) {
  const { onOpen } = useModal();
  const params = useParams<Record<string, string | string[] | undefined>>();
  const currentChannelId = normalizeChannelParam(params?.[CHANNEL_PARAM]);

  return (
    <DropdownMenu>
      <DropdownMenuTrigger
        render={
          <button className="w-full h-12 px-4 flex items-center justify-between border-b border-[#1f2023] font-bold text-white hover:bg-[#35373c] transition shadow-sm outline-none">
            <span className="truncate text-base">{server.name}</span>
            <ChevronDown className="w-4 h-4 text-gray-300 ml-2 shrink-0" />
          </button>
        }
      />

      <DropdownMenuContent
        className="w-56 bg-[#111214] text-[#dbdee1] border-none p-1.5 font-medium space-y-[2px]"
        side="bottom"
        align="start"
        sideOffset={4}
      >
        {/* Server Boost */}
        <DropdownMenuItem className="px-3 py-2 text-sm text-[#b5bac1] hover:bg-[#5865f2] hover:text-white rounded cursor-pointer flex items-center justify-between">
          <span>Server Boost</span>
          <Sparkles className="w-4 h-4 ml-auto" />
        </DropdownMenuItem>

        <DropdownMenuSeparator className="bg-[#1f2023] my-1" />

        {/* Invite to Server: owner only. Hidden only when isOwner is explicitly false;
            the server action enforces ownership regardless. */}
        {server.isOwner !== false && (
          <DropdownMenuItem
            onClick={() =>
              onOpen("invite", {
                guildId: server.id,
                guildName: server.name,
                channelId: currentChannelId,
              })
            }
            className="px-3 py-2 text-sm text-[#b5bac1] hover:bg-[#5865f2] hover:text-white rounded cursor-pointer flex items-center justify-between"
          >
            <span>Invite to Server</span>
            <UserPlus className="w-4 h-4 ml-auto" />
          </DropdownMenuItem>
        )}

        {/* Server Settings */}
        <DropdownMenuItem className="px-3 py-2 text-sm text-[#b5bac1] hover:bg-[#5865f2] hover:text-white rounded cursor-pointer flex items-center justify-between">
          <span>Server Settings</span>
          <Settings className="w-4 h-4 ml-auto" />
        </DropdownMenuItem>

        {/* Create Channel */}
        <DropdownMenuItem
          onClick={() => onOpen("createChannel", { guildId: server.id })}
          className="px-3 py-2 text-sm text-[#b5bac1] hover:bg-[#5865f2] hover:text-white rounded cursor-pointer flex items-center justify-between"
        >
          <span>Create Channel</span>
          <PlusCircle className="w-4 h-4 ml-auto" />
        </DropdownMenuItem>

        {/* Create Category */}
        <DropdownMenuItem
          onClick={() => onOpen("createCategory", { guildId: server.id })}
          className="px-3 py-2 text-sm text-[#b5bac1] hover:bg-[#5865f2] hover:text-white rounded cursor-pointer flex items-center justify-between"
        >
          <span>Create Category</span>
          <FolderPlus className="w-4 h-4 ml-auto" />
        </DropdownMenuItem>

        {/* Create Event */}
        <DropdownMenuItem className="px-3 py-2 text-sm text-[#b5bac1] hover:bg-[#5865f2] hover:text-white rounded cursor-pointer flex items-center justify-between">
          <span>Create Event</span>
          <CalendarPlus className="w-4 h-4 ml-auto" />
        </DropdownMenuItem>

        {/* App Directory */}
        <DropdownMenuItem className="px-3 py-2 text-sm text-[#b5bac1] hover:bg-[#5865f2] hover:text-white rounded cursor-pointer flex items-center justify-between">
          <span>App Directory</span>
          <LayoutGrid className="w-4 h-4 ml-auto" />
        </DropdownMenuItem>

        <DropdownMenuSeparator className="bg-[#1f2023] my-1" />

        {/* Notification Settings */}
        <DropdownMenuItem className="px-3 py-2 text-sm text-[#b5bac1] hover:bg-[#5865f2] hover:text-white rounded cursor-pointer flex items-center justify-between">
          <span>Notification Settings</span>
          <Bell className="w-4 h-4 ml-auto" />
        </DropdownMenuItem>

        {/* Privacy Settings */}
        <DropdownMenuItem className="px-3 py-2 text-sm text-[#b5bac1] hover:bg-[#5865f2] hover:text-white rounded cursor-pointer flex items-center justify-between">
          <span>Privacy Settings</span>
          <Shield className="w-4 h-4 ml-auto" />
        </DropdownMenuItem>

        <DropdownMenuSeparator className="bg-[#1f2023] my-1" />

        {/* Edit Per-server Profile */}
        <DropdownMenuItem className="px-3 py-2 text-sm text-[#b5bac1] hover:bg-[#5865f2] hover:text-white rounded cursor-pointer flex items-center justify-between">
          <span>Edit Per-server Profile</span>
          <Pencil className="w-4 h-4 ml-auto" />
        </DropdownMenuItem>

        {/* Hide Muted Channels */}
        <DropdownMenuItem className="px-3 py-2 text-sm text-[#b5bac1] hover:bg-[#5865f2] hover:text-white rounded cursor-pointer flex items-center justify-between">
          <span>Hide Muted Channels</span>
          <EyeOff className="w-4 h-4 ml-auto" />
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
