"use client";

import React, { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { createGuildSchema, CreateGuildInput } from "@/features/guilds/schemas/guild.schema";
import { createGuild } from "@/features/guilds/actions/guild.actions";
import { X } from "lucide-react";
import { useRouter } from "next/navigation";

interface CreateServerModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export function CreateServerModal({ isOpen, onClose }: CreateServerModalProps) {
  const router = useRouter();
  const [serverError, setServerError] = useState<string | null>(null);

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<CreateGuildInput>({
    resolver: zodResolver(createGuildSchema),
    defaultValues: {
      name: "",
      description: "",
    },
  });

  if (!isOpen) return null;

  const onSubmit = async (data: CreateGuildInput) => {
    setServerError(null);
    const result = await createGuild(data);

    if (!result.success) {
      setServerError(typeof result.error === "string" ? result.error : "Failed to create server");
      return;
    }

    reset();
    onClose();
    router.refresh();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="relative w-full max-w-md rounded-lg bg-[#313338] p-6 text-[#dbdee1] shadow-2xl">
        {/* Close Button */}
        <button
          onClick={onClose}
          className="absolute right-4 top-4 text-[#949ba4] hover:text-white"
          aria-label="Close"
        >
          <X className="h-5 w-5" />
        </button>

        {/* Header */}
        <div className="text-center space-y-2 mb-6">
          <h2 className="text-2xl font-bold text-white">Customize your server</h2>
          <p className="text-sm text-[#949ba4]">
            Give your new server a personality with a name and an optional description. You can always change it later.
          </p>
        </div>

        {serverError && (
          <div className="mb-4 rounded bg-[#f23f43]/10 p-3 text-sm text-[#f23f43]">
            {serverError}
          </div>
        )}

        {/* Form */}
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-[#b5bac1] mb-2">
              Server Name
            </label>
            <input
              {...register("name")}
              type="text"
              placeholder="My awesome server"
              className="w-full rounded bg-[#1e1f22] p-2.5 text-white outline-none focus:ring-1 focus:ring-[#5865f2]"
            />
            {errors.name && (
              <p className="mt-1 text-xs text-[#f23f43]">{errors.name.message}</p>
            )}
          </div>

          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-[#b5bac1] mb-2">
              Description (Optional)
            </label>
            <textarea
              {...register("description")}
              rows={3}
              placeholder="What is your server about?"
              className="w-full rounded bg-[#1e1f22] p-2.5 text-white outline-none focus:ring-1 focus:ring-[#5865f2] resize-none"
            />
            {errors.description && (
              <p className="mt-1 text-xs text-[#f23f43]">{errors.description.message}</p>
            )}
          </div>

          {/* Footer */}
          <div className="flex items-center justify-between bg-[#2b2d31] -mx-6 -mb-6 p-4 rounded-b-lg mt-6">
            <button
              type="button"
              onClick={onClose}
              className="text-sm font-medium text-white hover:underline"
            >
              Back
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="rounded bg-[#5865f2] px-6 py-2.5 text-sm font-medium text-white transition hover:bg-[#4752c4] disabled:opacity-50"
            >
              {isSubmitting ? "Creating..." : "Create"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}