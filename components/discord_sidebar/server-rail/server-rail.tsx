"use client";

import React, { useState } from "react";
import Image from "next/image";
import { Server } from "../types";

import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";

import { Plus, Compass, Volume2 } from "lucide-react";
import { cn } from "@/lib/utils";
import { CreateServerModal } from "../server-rail/create-server-modal";

interface ServerRailProps {
  servers: Server[];
  activeServerId: string | null;
  onSelectServer: (id: string | null) => void;
}

export function ServerRail({
  servers,
  activeServerId,
  onSelectServer,
}: ServerRailProps) {
  const isHomeActive = activeServerId === null;
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);

  return (
    <TooltipProvider delay={0}>
      <aside className="z-20 flex h-full w-[72px] select-none flex-col items-center space-y-2 bg-[#1e1f22] py-3">
        {/* ========================================= */}
        {/* HOME / DIRECT MESSAGES */}
        {/* ========================================= */}

        <div className="group relative flex w-full items-center justify-center">
          {/* Active Indicator */}
          <span
            className={cn(
              "absolute left-0 w-1 rounded-r-full bg-white transition-all duration-200",
              isHomeActive ? "h-10" : "h-0 group-hover:h-5",
            )}
          />

          <Tooltip>
            <TooltipTrigger
              render={
                <button
                  type="button"
                  aria-label="Direct Messages"
                  aria-current={isHomeActive ? "page" : undefined}
                  onClick={() => onSelectServer(null)}
                  className={cn(
                    "flex h-12 w-12 items-center justify-center transition-all duration-200 group-hover:rounded-[16px]",
                    isHomeActive
                      ? "rounded-[16px] bg-[#5865f2] text-white"
                      : "rounded-[24px] bg-[#313338] text-gray-200 hover:bg-[#5865f2] hover:text-white",
                  )}
                >
                  {/* Discord Logo */}
                  <svg
                    className="h-7 w-7 fill-current"
                    viewBox="0 0 127.14 96.36"
                    aria-hidden="true"
                  >
                    <path d="M107.7,8.07A105.15,105.15,0,0,0,81.47,0a72.06,72.06,0,0,0-3.36,6.83A97.68,97.68,0,0,0,49,6.83,72.37,72.37,0,0,0,45.64,0,105.89,105.89,0,0,0,19.39,8.09C2.79,32.65-1.71,56.6.54,80.21h0A105.73,105.73,0,0,0,32.71,96.36,77.7,77.7,0,0,0,39.6,85.25a68.42,68.42,0,0,1-10.85-5.18c.91-.66,1.8-1.34,2.66-2a75.57,75.57,0,0,0,64.32,0c.87.71,1.76,1.39,2.66,2a68.68,68.68,0,0,1-10.87,5.19,77,77,0,0,0,6.89,11.1A105.25,105.25,0,0,0,126.6,80.22h0C129.24,52.84,121.72,29.1,107.7,8.07ZM42.45,65.69C36.18,65.69,31,60,31,53s5-12.74,11.43-12.74S54,45.91,53.87,53,48.73,65.69,42.45,65.69Zm42.24,0C78.41,65.69,73.25,60,73.25,53s5.07-12.74,11.44-12.74S96.23,45.91,96.1,53,91,65.69,84.69,65.69Z" />
                  </svg>
                </button>
              }
            />

            <TooltipContent
              side="right"
              sideOffset={12}
              className="border-none bg-[#111214] font-semibold text-white"
            >
              Direct Messages
            </TooltipContent>
          </Tooltip>
        </div>

        {/* Separator */}
        <div className="my-1 h-[2px] w-8 rounded bg-[#35363c]" />

        {/* ========================================= */}
        {/* SERVER LIST */}
        {/* ========================================= */}

        <div className="no-scrollbar w-full flex-1 space-y-2 overflow-y-auto">
          {servers.map((server) => {
            const isActive = activeServerId === server.id;
            const unreadCount = server.unreadCount ?? 0;

            const initials = server.name
              .trim()
              .split(/\s+/)
              .filter(Boolean)
              .map((word) => word[0])
              .join("")
              .slice(0, 3)
              .toUpperCase();

            return (
              <div
                key={server.id}
                className="group relative flex w-full items-center justify-center"
              >
                {/* Active / Unread Indicator */}
                <span
                  className={cn(
                    "absolute left-0 w-1 rounded-r-full bg-white transition-all duration-200",
                    isActive
                      ? "h-10"
                      : server.hasUnread
                        ? "h-2 group-hover:h-5"
                        : "h-0 group-hover:h-5",
                  )}
                />

                <Tooltip>
                  <TooltipTrigger
                    render={
                      <button
                        type="button"
                        aria-label={server.name}
                        aria-current={isActive ? "page" : undefined}
                        onClick={() => onSelectServer(server.id)}
                        className={cn(
                          "relative flex h-12 w-12 items-center justify-center overflow-visible text-sm font-bold transition-all duration-200 group-hover:rounded-[16px]",
                          isActive
                            ? "rounded-[16px] bg-[#5865f2] text-white"
                            : "rounded-[24px] bg-[#313338] text-gray-200 hover:bg-[#5865f2] hover:text-white",
                        )}
                      >
                        {/* Server Icon */}
                        {server.iconUrl ? (
                          <Image
                            src={server.iconUrl}
                            alt=""
                            width={48}
                            height={48}
                            unoptimized
                            className={cn(
                              "h-12 w-12 object-cover transition-all duration-200 group-hover:rounded-[16px]",
                              isActive ? "rounded-[16px]" : "rounded-[24px]",
                            )}
                          />
                        ) : (
                          <span aria-hidden="true">{initials || "?"}</span>
                        )}

                        {/* Unread Badge */}
                        {unreadCount > 0 && (
                          <span
                            className="absolute -bottom-1 -right-1 flex min-w-[18px] items-center justify-center rounded-full border-[3px] border-[#1e1f22] bg-[#f23f43] px-[6px] py-[1px] text-[11px] font-extrabold text-white"
                            aria-label={`${unreadCount} unread messages`}
                          >
                            {unreadCount > 99 ? "99+" : unreadCount}
                          </span>
                        )}

                        {/* Audio Activity */}
                        {server.hasAudioActivity && (
                          <span className="absolute -right-1 -top-1 rounded-full border-[3px] border-[#1e1f22] bg-[#f0b232] p-1 text-black">
                            <Volume2
                              className="h-3 w-3 fill-current"
                              aria-hidden="true"
                            />
                          </span>
                        )}
                      </button>
                    }
                  />

                  <TooltipContent
                    side="right"
                    sideOffset={12}
                    className="border-none bg-[#111214] font-semibold text-white"
                  >
                    {server.name}
                  </TooltipContent>
                </Tooltip>
              </div>
            );
          })}
        </div>

        {/* ========================================= */}
        {/* ACTION BUTTONS */}
        {/* ========================================= */}

        <div className="flex w-full flex-col items-center space-y-2 border-t border-[#35363c] pt-2">
          {/* Add Server */}
          <Tooltip>
            <TooltipTrigger
              render={
                <button
                  type="button"
                  aria-label="Add a Server"
                  onClick={() => setIsCreateModalOpen(true)}
                  className="group flex h-12 w-12 items-center justify-center rounded-[24px] bg-[#313338] text-[#23a55a] transition-all duration-200 hover:rounded-[16px] hover:bg-[#23a55a] hover:text-white"
                >
                  <Plus className="h-6 w-6" aria-hidden="true" />
                </button>
              }
            />

            <TooltipContent
              side="right"
              sideOffset={12}
              className="border-none bg-[#111214] font-semibold text-white"
            >
              Add a Server
            </TooltipContent>
          </Tooltip>

          {/* Discover Servers */}
          <Tooltip>
            <TooltipTrigger
              render={
                <button
                  type="button"
                  aria-label="Discover Servers"
                  className="group flex h-12 w-12 items-center justify-center rounded-[24px] bg-[#313338] text-[#23a55a] transition-all duration-200 hover:rounded-[16px] hover:bg-[#23a55a] hover:text-white"
                >
                  <Compass className="h-6 w-6" aria-hidden="true" />
                </button>
              }
            />

            <TooltipContent
              side="right"
              sideOffset={12}
              className="border-none bg-[#111214] font-semibold text-white"
            >
              Explore Discoverable Servers
            </TooltipContent>
          </Tooltip>
        </div>

        {/* Create Server Modal */}
        <CreateServerModal
          isOpen={isCreateModalOpen}
          onClose={() => setIsCreateModalOpen(false)}
        />
      </aside>
    </TooltipProvider>
  );
}
