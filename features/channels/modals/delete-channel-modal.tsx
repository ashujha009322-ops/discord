/* eslint-disable @typescript-eslint/no-explicit-any */
"use client";

import React, { useState } from "react";
import { useRouter } from "next/navigation";
import { useModal } from "@/store/use-modal-store";
import { deleteChannelAction } from "../actions/channel";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

export function DeleteChannelModal() {
  const router = useRouter();
  const { isOpen, onClose, type, data } = useModal();
  const isModalOpen = isOpen && type === "deleteChannel";
  const { channel, guildId } = data;

  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState("");

  const handleClose = () => {
    setError("");
    onClose();
  };

  const onClick = async () => {
    if (!channel || !guildId) return;

    try {
      setIsLoading(true);
      setError("");

      const res = await deleteChannelAction({
        id: channel.id,
        guildId,
      });

      if (!res.success) {
        setError(res.error || "Failed to delete channel.");
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
            Delete Channel
          </DialogTitle>
        </DialogHeader>

        <div className="px-6 space-y-3">
          {error && (
            <div className="bg-[#f23f43]/10 border border-[#f23f43] text-[#f23f43] px-3 py-2 rounded text-xs">
              {error}
            </div>
          )}
          <p className="text-sm text-[#949ba4]">
            Are you sure you want to delete{" "}
            <span className="font-semibold text-white">#{channel?.name}</span>?
            This action cannot be undone.
          </p>
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
            type="button"
            onClick={onClick}
            disabled={isLoading}
            className="bg-[#da373c] hover:bg-[#a1282b] text-white px-6 py-2 rounded text-sm font-semibold transition disabled:opacity-50"
          >
            {isLoading ? "Deleting..." : "Delete Channel"}
          </button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
