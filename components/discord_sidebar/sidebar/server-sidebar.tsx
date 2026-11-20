/* eslint-disable @typescript-eslint/no-explicit-any */
"use client";

import React, { useState } from "react";
import {
  ChevronDown,
  ChevronRight,
  Hash,
  Volume2,
  Megaphone,
  MessagesSquare,
  Plus,
  Settings,
  Trash,
  UserPlus,
  Calendar,
} from "lucide-react";
import { ChannelType } from "@/app/generated/prisma/enums";
import { cn } from "@/lib/utils";
import { ServerHeaderDropdown } from "../../discord_dropdowns/server-header-dropdown";
import { useModal } from "@/store/use-modal-store";

const CHANNEL_ICON_MAP: Record<string, any> = {
  [ChannelType.TEXT]: Hash,
  [ChannelType.VOICE]: Volume2,
  [ChannelType.ANNOUNCEMENT]: Megaphone,
  [ChannelType.FORUM]: MessagesSquare,
};

interface ServerSidebarProps {
  server: any;
  activeChannelId: string;
  onSelectChannel: (id: string) => void;
}

export function ServerSidebar({
  server,
  activeChannelId,
  onSelectChannel,
}: ServerSidebarProps) {
  const { onOpen } = useModal();
  const [collapsedCategories, setCollapsedCategories] = useState<
    Record<string, boolean>
  >({});

  const toggleCategory = (catId: string) => {
    setCollapsedCategories((prev) => ({ ...prev, [catId]: !prev[catId] }));
  };

  const rawChannels: any[] = server.channels || [];
  const hasCategories =
    Array.isArray(server.categories) && server.categories.length > 0;

  // Resolve category structure dynamically from Prisma channels array or mapper categories
  const categoriesList = hasCategories
    ? server.categories
    : rawChannels
        .filter((c) => c.parentId === null)
        .map((cat) => ({
          id: cat.id,
          name: cat.name,
          rawCategory: cat,
          channels: rawChannels.filter((ch) => ch.parentId === cat.id),
        }));

  const uncategorizedChannels = hasCategories
    ? []
    : rawChannels.filter(
        (c) =>
          c.parentId === null &&
          !categoriesList.some((cat: any) => cat.id === c.id),
      );

  const renderChannelItem = (channel: any) => {
    const Icon = CHANNEL_ICON_MAP[channel.type] || Hash;
    const isActive = activeChannelId === channel.id;

    return (
      <div key={channel.id} className="relative flex items-center group">
        <div
          onClick={() => onSelectChannel(channel.id)}
          className={cn(
            "w-full flex items-center justify-between px-2 py-1.5 rounded group transition text-left",
            isActive
              ? "bg-[#404249] text-white font-medium"
              : "text-[#949ba4] hover:bg-[#35373c] hover:text-[#dbdee1]",
          )}
        >
          <div className="flex items-center truncate mr-2">
            <Icon className="w-4 h-4 mr-1.5 shrink-0 text-[#80848e] group-hover:text-gray-200" />
            <span className="text-sm truncate font-medium">{channel.name}</span>
          </div>

          <div className="flex items-center space-x-1 shrink-0 opacity-0 group-hover:opacity-100 transition">
            {/* Edit Channel Action */}
            <button
              onClick={(e) => {
                e.stopPropagation();
                onOpen("editChannel", { channel, guildId: server.id });
              }}
              title="Edit Channel"
              className="text-[#949ba4] hover:text-white transition p-0.5"
            >
              <Settings className="w-3.5 h-3.5" />
            </button>

            {/* Delete Channel Action */}
            <button
              onClick={(e) => {
                e.stopPropagation();
                onOpen("deleteChannel", { channel, guildId: server.id });
              }}
              title="Delete Channel"
              className="text-[#949ba4] hover:text-[#f23f43] transition p-0.5"
            >
              <Trash className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      </div>
    );
  };

  return (
    <div className="flex-1 flex flex-col min-h-0 bg-[#2b2d31] text-gray-400 select-none">
      {/* Header Dropdown Menu */}
      <ServerHeaderDropdown server={{ id: server.id, name: server.name }} />

      <div className="flex-1 overflow-y-auto px-2 py-3 space-y-3 no-scrollbar">
        {/* Boost Banner */}
        {server.boostGoal !== undefined && (
          <div className="bg-[#1e1f22] p-2.5 rounded-md flex items-center justify-between cursor-pointer hover:bg-[#232428] transition">
            <span className="text-xs font-bold text-gray-200">Boost Goal</span>
            <span className="text-xs font-bold text-gray-400 flex items-center hover:text-white">
              {server.boostCount || 0}/{server.boostGoal} Boosts{" "}
              <ChevronRight className="w-3.5 h-3.5 ml-1" />
            </span>
          </div>
        )}

        {/* Events Button */}
        <button className="w-full flex items-center px-2 py-1.5 rounded hover:bg-[#35373c] text-gray-300 hover:text-white transition group">
          <Calendar className="w-5 h-5 mr-3 text-gray-400 group-hover:text-white" />
          <span className="font-semibold text-sm">Events</span>
        </button>

        <div className="h-[1px] bg-[#35363c] mx-2" />

        {/* Uncategorized Channels */}
        {uncategorizedChannels.length > 0 && (
          <div className="space-y-0.5">
            {uncategorizedChannels.map(renderChannelItem)}
          </div>
        )}

        {/* Categories & Channels */}
        {categoriesList.map((category: any) => {
          const isCollapsed = collapsedCategories[category.id];

          return (
            <div key={category.id} className="space-y-0.5">
              {/* Category Header */}
              <div className="flex items-center justify-between px-1 py-1 text-xs font-bold text-[#949ba4] hover:text-gray-200 group">
                <button
                  onClick={() => toggleCategory(category.id)}
                  className="flex items-center flex-1 uppercase tracking-wider text-left"
                >
                  {isCollapsed ? (
                    <ChevronRight className="w-3 h-3 mr-1 text-[#949ba4]" />
                  ) : (
                    <ChevronDown className="w-3 h-3 mr-1 text-[#949ba4]" />
                  )}
                  <span className="truncate">{category.name}</span>
                </button>

                <div className="flex items-center space-x-1 opacity-0 group-hover:opacity-100 transition">
                  {/* Create Channel in Category */}
                  <button
                    onClick={() =>
                      onOpen("createChannel", {
                        guildId: server.id,
                        parentId: category.id,
                      })
                    }
                    className="text-[#949ba4] hover:text-white transition p-0.5"
                    title="Create Channel"
                  >
                    <Plus className="w-4 h-4" />
                  </button>

                  {/* Edit Category */}
                  {category.rawCategory && (
                    <button
                      onClick={() =>
                        onOpen("editChannel", {
                          channel: category.rawCategory,
                          guildId: server.id,
                        })
                      }
                      className="text-[#949ba4] hover:text-white transition p-0.5"
                      title="Edit Category"
                    >
                      <Settings className="w-3.5 h-3.5" />
                    </button>
                  )}

                  {/* Delete Category */}
                  {category.rawCategory && (
                    <button
                      onClick={() =>
                        onOpen("deleteChannel", {
                          channel: category.rawCategory,
                          guildId: server.id,
                        })
                      }
                      className="text-[#949ba4] hover:text-[#f23f43] transition p-0.5"
                      title="Delete Category"
                    >
                      <Trash className="w-3.5 h-3.5" />
                    </button>
                  )}
                </div>
              </div>

              {/* Channels Under Category */}
              {!isCollapsed &&
                category.channels?.map((channel: any) =>
                  renderChannelItem(channel),
                )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
