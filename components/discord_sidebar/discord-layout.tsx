/* eslint-disable react-hooks/set-state-in-effect */
/* eslint-disable @typescript-eslint/no-explicit-any */
"use client";

import React, { useState, useEffect } from "react";
import { ServerRail } from "./server-rail/server-rail";
import { DMSidebar } from "./sidebar/dm-sidebar";
import { ServerSidebar } from "./sidebar/server-sidebar";
import { UserFooter } from "./sidebar/user-footer";
import { ChatMessages } from "./chat/chat-messages";
import { ChatInput } from "./chat/chat-input";
import { MemberList } from "./sidebar/member-list";
import { ModalProvider } from "../../features/channels/modals/modal-provider";
import { useChannelMessages } from "../../features/messages/useChannelMessages";
import type { Outcome, SendOutcome } from "../../store/message-store";
import { mockDMs, currentUser } from "./mock-data";
import { Server, ServerMember } from "./types";
import {
  Hash,
  MessageSquare,
  Bell,
  Pin,
  Users,
  Search,
  Inbox,
  HelpCircle,
} from "lucide-react";
import { MemberModals } from "../member-list/member-modals";

interface DiscordLayoutProps {
  initialServers: Server[];
}

export function DiscordLayout({ initialServers }: DiscordLayoutProps) {
  const [servers, setServers] = useState<Server[]>(initialServers);
  const [activeServerId, setActiveServerId] = useState<string | null>(
    initialServers.length > 0 ? initialServers[0].id : null,
  );
  const [activeDmId, setActiveDmId] = useState<string | null>("dm-1");
  const [activeChannelId, setActiveChannelId] = useState<string>("");
  const [showMemberList, setShowMemberList] = useState(true);
  const [actionError, setActionError] = useState<string | null>(null);

  // Sync state whenever initialServers prop updates (e.g. after router.refresh())
  useEffect(() => {
    setServers(initialServers);

    if (initialServers.length > 0 && !activeServerId) {
      setActiveServerId(initialServers[0].id);
    }
  }, [initialServers, activeServerId]);

  const currentServer = servers.find((s) => s.id === activeServerId);
  const currentDm = mockDMs.find((d) => d.id === activeDmId);

  // Safely locate active channel within current server
  const rawChannels = (currentServer as any)?.channels || [];
  const activeChannel = rawChannels.find(
    (ch: any) => ch.id === activeChannelId,
  );

  // Keep activeChannelId valid whenever the server or its channel list changes
  useEffect(() => {
    if (!currentServer) return;
    if (rawChannels.length === 0) {
      if (activeChannelId !== "") setActiveChannelId("");
      return;
    }
    if (!activeChannel) {
      setActiveChannelId(rawChannels[0].id);
    }
  }, [currentServer, rawChannels, activeChannel, activeChannelId]);

  const resolvedChannelId =
    activeServerId !== null ? activeChannelId || null : null;

  const chat = useChannelMessages(resolvedChannelId);

  // Clear stale action errors when switching channels
  useEffect(() => {
    setActionError(null);
  }, [resolvedChannelId]);

  async function runAction(request: Promise<Outcome | SendOutcome>) {
    const result = await request;
    setActionError(result.ok ? null : result.error);
  }

  const isTimedOut = Boolean(chat.timeoutUntil);
  const inputDisabled = chat.status !== "ready" || isTimedOut;

  const inputPlaceholder = isTimedOut
    ? `You are timed out until ${chat.timeoutUntil}`
    : activeServerId !== null
      ? `Message #${activeChannel?.name || "general"}`
      : `Message @${currentDm?.user.name || "user"}`;

  return (
    <div className="flex h-screen w-full bg-[#313338] overflow-hidden antialiased font-sans">
      {/* Global Modals Container */}
      <ModalProvider />
      <MemberModals />
      <ServerRail
        servers={servers}
        activeServerId={activeServerId}
        onSelectServer={(id) => {
          setActiveServerId(id);
          if (id) {
            const server: any = servers.find((s) => s.id === id);
            const firstChannel = server?.channels?.[0]?.id ?? "";
            setActiveChannelId(firstChannel);
          } else {
            setActiveChannelId("");
          }
        }}
      />

      <div className="w-60 bg-[#2b2d31] flex flex-col shrink-0 border-r border-[#1f2023]">
        {activeServerId === null ? (
          <DMSidebar
            dms={mockDMs}
            activeDmId={activeDmId}
            onSelectDm={(id) => setActiveDmId(id)}
          />
        ) : currentServer ? (
          <ServerSidebar
            server={currentServer}
            activeChannelId={activeChannelId}
            onSelectChannel={(id) => setActiveChannelId(id)}
          />
        ) : null}

        <UserFooter user={currentUser} />
      </div>

      <main className="flex-1 flex flex-col min-w-0 bg-[#313338] text-gray-200">
        <header className="h-12 px-4 border-b border-[#1f2023] bg-[#313338] flex items-center justify-between shadow-sm shrink-0">
          <div className="flex items-center space-x-2 truncate">
            {activeServerId !== null ? (
              <>
                <Hash className="w-6 h-6 text-[#80848e]" />
                <span className="font-bold text-white text-base truncate">
                  {activeChannel?.name || "general"}
                </span>
              </>
            ) : (
              <>
                <MessageSquare className="w-5 h-5 text-[#80848e] mr-1" />
                <span className="font-bold text-white text-base truncate">
                  {currentDm?.user.name || "Direct Messages"}
                </span>
              </>
            )}
          </div>

          <div className="flex items-center space-x-4 text-[#b5bac1]">
            <Bell className="w-5 h-5 hover:text-white cursor-pointer transition" />
            <Pin className="w-5 h-5 hover:text-white cursor-pointer transition" />
            <Users
              className={`w-5 h-5 cursor-pointer transition ${
                showMemberList ? "text-white" : "hover:text-white"
              }`}
              onClick={() => setShowMemberList(!showMemberList)}
            />
            <div className="relative flex items-center">
              <input
                type="text"
                placeholder="Search"
                className="bg-[#1e1f22] text-xs text-white rounded px-2 py-1 pr-6 w-36 focus:w-48 transition-all focus:outline-none placeholder:text-[#949ba4]"
              />
              <Search className="w-3.5 h-3.5 text-[#949ba4] absolute right-2 pointer-events-none" />
            </div>
            <Inbox className="w-5 h-5 hover:text-white cursor-pointer transition" />
            <HelpCircle className="w-5 h-5 hover:text-white cursor-pointer transition" />
          </div>
        </header>

        <div className="flex-1 flex min-h-0">
          <div className="flex-1 flex flex-col min-w-0">
            <ChatMessages
              messages={chat.messages}
              channelName={activeChannel?.name || "general"}
              status={chat.status}
              error={chat.error}
              hasMore={chat.hasMore}
              loadingOlder={chat.loadingOlder}
              onLoadOlder={() => runAction(chat.loadOlder())}
              onReload={() => void chat.reload()}
              canEdit={chat.canEdit}
              canDelete={chat.canDelete}
              onEdit={(messageId, nextContent) =>
                runAction(chat.edit(messageId, nextContent))
              }
              onDelete={(messageId) => runAction(chat.remove(messageId))}
              onRetry={(messageId) => runAction(chat.retry(messageId))}
              onDiscard={chat.discard}
            />

            <ChatInput
              placeholder={inputPlaceholder}
              disabled={inputDisabled}
              error={actionError}
              onDismissError={() => setActionError(null)}
              onSendMessage={(content) => runAction(chat.send({ content }))}
            />
          </div>

          {activeServerId !== null && showMemberList && (
            <MemberList guildId={activeServerId} />
          )}
        </div>
      </main>
    </div>
  );
}
