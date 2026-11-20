/* eslint-disable @typescript-eslint/no-explicit-any */
"use client";

import React, { useState } from "react";
import { useRouter } from "next/navigation";
import { Lock } from "lucide-react";
import { useModal } from "@/store/use-modal-store";
import { createCategoryAction } from "../actions/channel";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

export function CreateCategoryModal() {
  const router = useRouter();
  const { isOpen, onClose, type, data } = useModal();
  const isModalOpen = isOpen && type === "createCategory";
  const { guildId } = data;

  const [name, setName] = useState("");
  const [isPrivate, setIsPrivate] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState("");

  const handleClose = () => {
    setName("");
    setIsPrivate(false);
    setError("");
    onClose();
  };

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!guildId) return;

    try {
      setIsLoading(true);
      setError("");

      const res = await createCategoryAction({
        guildId,    
        name,
        isPrivate,
        type: "TEXT", // Default container type
      });

      if (!res.success) {
        setError(res.error || "Failed to create category.");
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
            Create Category
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
                Category Name
              </label>
              <input
                disabled={isLoading}
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="NEW CATEGORY"
                className="w-full bg-[#1e1f22] text-white px-3 py-2 rounded-md outline-none focus:ring-2 focus:ring-[#5865f2] text-sm"
                required
              />
            </div>

            <div className="flex items-center justify-between bg-[#2b2d31] p-3 rounded-md">
              <div className="flex items-center space-x-2">
                <Lock className="w-5 h-5 text-[#949ba4]" />
                <div>
                  <div className="text-sm font-semibold text-white">
                    Private Category
                  </div>
                  <div className="text-xs text-[#949ba4]">
                    Only members of selected roles can see this category
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
              {isLoading ? "Creating..." : "Create Category"}
            </button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
