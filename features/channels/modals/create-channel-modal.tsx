/* eslint-disable @typescript-eslint/no-explicit-any */
/* eslint-disable react-hooks/set-state-in-effect */
"use client";

import React, { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Hash, Volume2, Megaphone, MessagesSquare, Lock } from "lucide-react";
import { ChannelType } from "@/app/generated/prisma/enums";
import { useModal } from "@/store/use-modal-store";
import { createChannelAction } from "../actions/channel";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

const CHANNEL_TYPES = [
  {
    type: ChannelType.TEXT,
    label: "Text",
    description: "Post messages, images, memes, opinions, and puns",
    icon: Hash,
  },
  {
    type: ChannelType.VOICE,
    label: "Voice",
    description: "Hang out together with voice, video, and screen share",
    icon: Volume2,
  },
  {
    type: ChannelType.ANNOUNCEMENT,
    label: "Announcement",
    description: "Post important updates for all server members",
    icon: Megaphone,
  },
  {
    type: ChannelType.FORUM,
    label: "Forum",
    description: "Organize discussions into threaded forum posts",
    icon: MessagesSquare,
  },
  {
    type: ChannelType.DM,
    label: "Direct Message",
    description: "Send private messages to specific members",
    icon: Lock,
  },
  {
    type: ChannelType.GROUP_DM,
    label: "Group DM",
    description: "Create a private group chat with multiple members",
    icon: Lock,
  },
  {
    type: ChannelType.THREAD,
    label: "Thread",
    description: "Create a temporary conversation within a channel",
    icon: Lock,
  },
];

export function CreateChannelModal() {
  const router = useRouter();
  const { isOpen, onClose, type, data } = useModal();
  const isModalOpen = isOpen && type === "createChannel";
  const { guildId, parentId } = data;

  const [name, setName] = useState("");
  const [channelType, setChannelType] = useState<ChannelType>(ChannelType.TEXT);
  const [topic, setTopic] = useState("");
  const [isPrivate, setIsPrivate] = useState(false);
  const [slowmodeSeconds, setSlowmodeSeconds] = useState(0);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    if (data.channelType) {
      setChannelType(data.channelType);
    }
  }, [data.channelType]);

  const handleClose = () => {
    setName("");
    setTopic("");
    setChannelType(ChannelType.TEXT);
    setIsPrivate(false);
    setSlowmodeSeconds(0);
    setError("");
    onClose();
  };

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!guildId) return;

    try {
      setIsLoading(true);
      setError("");

      const res = await createChannelAction({
        guildId,
        parentId: parentId ?? null,
        name,
        type: channelType,
        topic: topic || undefined,
        isPrivate,
        slowmodeSeconds,
      });

      if (!res.success) {
        setError(res.error || "Failed to create channel.");
        return;
      }

      handleClose();
      router.refresh();
    } catch (err: any) {
      setError(err.message || "An error occurred");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Dialog open={isModalOpen} onOpenChange={handleClose}>
      <DialogContent className="bg-[#313338] text-[#dbdee1] border-none p-0 overflow-hidden max-w-md">
        <DialogHeader className="pt-6 px-6 text-left">
          <DialogTitle className="text-2xl font-bold text-white">
            Create Channel
          </DialogTitle>
        </DialogHeader>

        <form onSubmit={onSubmit} className="space-y-4">
          <div className="px-6 space-y-4">
            {error && (
              <div className="bg-[#f23f43]/10 border border-[#f23f43] text-[#f23f43] px-3 py-2 rounded text-xs">
                {error}
              </div>
            )}

            {/* Channel Type Selector */}
            <div className="space-y-2">
              <label className="text-xs font-bold uppercase text-[#b5bac1]">
                Channel Type
              </label>
              <div className="space-y-2">
                {CHANNEL_TYPES.map((item) => {
                  const Icon = item.icon;
                  const isSelected = channelType === item.type;
                  return (
                    <div
                      key={item.type}
                      onClick={() => setChannelType(item.type)}
                      className={`flex items-center p-3 rounded-md cursor-pointer transition ${
                        isSelected
                          ? "bg-[#383a40] text-white"
                          : "bg-[#2b2d31] hover:bg-[#35373c] text-[#949ba4]"
                      }`}
                    >
                      <Icon className="w-6 h-6 mr-3 shrink-0" />
                      <div className="flex-1">
                        <div className="text-sm font-semibold text-white">
                          {item.label}
                        </div>
                        <div className="text-xs text-[#949ba4]">
                          {item.description}
                        </div>
                      </div>
                      <input
                        type="radio"
                        name="channelType"
                        checked={isSelected}
                        onChange={() => setChannelType(item.type)}
                        className="accent-[#5865f2] w-4 h-4 cursor-pointer"
                      />
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Channel Name Input */}
            <div className="space-y-2">
              <label className="text-xs font-bold uppercase text-[#b5bac1]">
                Channel Name
              </label>
              <div className="relative flex items-center">
                <span className="absolute left-3 text-[#949ba4] font-bold">
                  #
                </span>
                <input
                  disabled={isLoading}
                  value={name}
                  onChange={(e) =>
                    setName(e.target.value.toLowerCase().replace(/\s+/g, "-"))
                  }
                  placeholder="new-channel"
                  className="w-full bg-[#1e1f22] text-white pl-8 pr-3 py-2 rounded-md outline-none focus:ring-2 focus:ring-[#5865f2] text-sm"
                  required
                />
              </div>
            </div>

            {/* Channel Topic Input */}
            <div className="space-y-2">
              <label className="text-xs font-bold uppercase text-[#b5bac1]">
                Topic (Optional)
              </label>
              <input
                disabled={isLoading}
                value={topic}
                onChange={(e) => setTopic(e.target.value)}
                placeholder="What is this channel about?"
                className="w-full bg-[#1e1f22] text-white px-3 py-2 rounded-md outline-none focus:ring-2 focus:ring-[#5865f2] text-sm"
              />
            </div>

            {/* Private Channel Toggle */}
            <div className="flex items-center justify-between bg-[#2b2d31] p-3 rounded-md">
              <div className="flex items-center space-x-2">
                <Lock className="w-5 h-5 text-[#949ba4]" />
                <div>
                  <div className="text-sm font-semibold text-white">
                    Private Channel
                  </div>
                  <div className="text-xs text-[#949ba4]">
                    Only selected members and roles can view this channel
                  </div>
                </div>
              </div>
              <input
                type="checkbox"
                checked={isPrivate}
                onChange={(e) => setIsPrivate(e.target.checked)}
                className="w-5 h-5 accent-[#5865f2] rounded cursor-pointer"
              />
            </div>
          </div>

          <DialogFooter className="bg-[#2b2d31] px-6 py-4 flex justify-between items-center">
            <button
              type="button"
              onClick={handleClose}
              disabled={isLoading}
              className="text-sm text-white hover:underline px-4 py-2"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isLoading || !name.trim()}
              className="bg-[#5865f2] hover:bg-[#4752c4] text-white px-6 py-2 rounded text-sm font-semibold transition disabled:opacity-50"
            >
              {isLoading ? "Creating..." : "Create Channel"}
            </button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
