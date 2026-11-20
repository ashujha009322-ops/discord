/* eslint-disable @typescript-eslint/no-explicit-any */
/* eslint-disable react-hooks/set-state-in-effect */
"use client";

import React, { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useModal } from "@/store/use-modal-store";
import { updateChannelAction } from "../actions/channel";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

export function EditChannelModal() {
  const router = useRouter();
  const { isOpen, onClose, type, data } = useModal();
  const isModalOpen = isOpen && type === "editChannel";
  const { channel, guildId } = data;

  const [name, setName] = useState("");
  const [topic, setTopic] = useState("");
  const [slowmodeSeconds, setSlowmodeSeconds] = useState(0);
  const [isPrivate, setIsPrivate] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    if (channel) {
      setName(channel.name || "");
      setTopic(channel.topic || "");
      setSlowmodeSeconds(channel.slowmodeSeconds || 0);
      setIsPrivate(channel.isPrivate || false);
    }
  }, [channel]);

  const handleClose = () => {
    setError("");
    onClose();
  };

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!channel || !guildId) return;

    try {
      setIsLoading(true);
      setError("");

      const res = await updateChannelAction({
        id: channel.id,
        guildId,
        name: name.toLowerCase().trim(),
        topic: topic || null,
        slowmodeSeconds,
        isPrivate,
      });

      if (!res.success) {
        setError(res.error || "Failed to update channel.");
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
            Overview Settings
          </DialogTitle>
        </DialogHeader>

        <form onSubmit={onSubmit} className="space-y-4">
          <div className="px-6 space-y-4">
            {error && (
              <div className="bg-[#f23f43]/10 border border-[#f23f43] text-[#f23f43] px-3 py-2 rounded text-xs">
                {error}
              </div>
            )}

            <div className="space-y-2">
              <label className="text-xs font-bold uppercase text-[#b5bac1]">
                Channel Name
              </label>
              <input
                disabled={isLoading}
                value={name}
                onChange={(e) =>
                  setName(e.target.value.toLowerCase().replace(/\s+/g, "-"))
                }
                className="w-full bg-[#1e1f22] text-white px-3 py-2 rounded-md outline-none focus:ring-2 focus:ring-[#5865f2] text-sm"
                required
              />
            </div>

            <div className="space-y-2">
              <label className="text-xs font-bold uppercase text-[#b5bac1]">
                Channel Topic
              </label>
              <textarea
                disabled={isLoading}
                value={topic}
                onChange={(e) => setTopic(e.target.value)}
                rows={3}
                placeholder="Let everyone know how to use this channel"
                className="w-full bg-[#1e1f22] text-white px-3 py-2 rounded-md outline-none focus:ring-2 focus:ring-[#5865f2] text-sm resize-none"
              />
            </div>

            <div className="space-y-2">
              <label className="text-xs font-bold uppercase text-[#b5bac1]">
                Slowmode (Seconds)
              </label>
              <select
                disabled={isLoading}
                value={slowmodeSeconds}
                onChange={(e) => setSlowmodeSeconds(Number(e.target.value))}
                className="w-full bg-[#1e1f22] text-white px-3 py-2 rounded-md outline-none focus:ring-2 focus:ring-[#5865f2] text-sm"
              >
                <option value={0}>Off</option>
                <option value={5}>5s</option>
                <option value={10}>10s</option>
                <option value={15}>15s</option>
                <option value={30}>30s</option>
                <option value={60}>1m</option>
                <option value={120}>2m</option>
                <option value={300}>5m</option>
                <option value={600}>10m</option>
              </select>
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
              className="bg-[#248046] hover:bg-[#1a6334] text-white px-6 py-2 rounded text-sm font-semibold transition disabled:opacity-50"
            >
              {isLoading ? "Saving..." : "Save Changes"}
            </button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
