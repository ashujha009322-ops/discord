"use client";

import React from "react";
import { useOnboardingStore } from "@/store/useOnboardingStore";

export function StepMediaUpload() {
  const {
    avatarPreview,
    bannerPreview,
    setAvatar,
    setBanner,
    nextStep,
    prevStep,
  } = useOnboardingStore();

  const handleFile = (
    e: React.ChangeEvent<HTMLInputElement>,
    setter: (file: File | null) => void,
  ) => {
    const file = e.target.files?.[0] || null;
    setter(file);
  };

  return (
    <div className="space-y-6">
      <div className="space-y-1">
        <h2 className="text-xl font-semibold text-zinc-100 tracking-tight">
          Customize Profile Media
        </h2>
        <p className="text-sm text-zinc-400">
          Add an avatar and banner picture to personalize your space.
        </p>
      </div>

      <div className="space-y-2">
        <label className="block text-xs font-medium text-zinc-300 uppercase tracking-wider">
          Banner Image
        </label>
        <div className="relative group w-full h-32 rounded-lg bg-zinc-900 border border-dashed border-zinc-800 hover:border-zinc-600 overflow-hidden flex items-center justify-center transition-colors">
          {bannerPreview ? (
            <img
              src={bannerPreview}
              alt="Banner Preview"
              className="w-full h-full object-cover"
            />
          ) : (
            <span className="text-xs text-zinc-500">
              Upload Banner (16:9 recommended)
            </span>
          )}
          <input
            type="file"
            accept="image/*"
            onChange={(e) => handleFile(e, setBanner)}
            className="absolute inset-0 opacity-0 cursor-pointer"
          />
        </div>
      </div>

      <div className="space-y-2">
        <label className="block text-xs font-medium text-zinc-300 uppercase tracking-wider">
          Profile Picture
        </label>
        <div className="flex items-center gap-4">
          <div className="relative group w-20 h-20 rounded-full bg-zinc-900 border border-dashed border-zinc-800 hover:border-zinc-600 overflow-hidden flex items-center justify-center shrink-0 transition-colors">
            {avatarPreview ? (
              <img
                src={avatarPreview}
                alt="Avatar Preview"
                className="w-full h-full object-cover"
              />
            ) : (
              <span className="text-xs text-zinc-500">Avatar</span>
            )}
            <input
              type="file"
              accept="image/*"
              onChange={(e) => handleFile(e, setAvatar)}
              className="absolute inset-0 opacity-0 cursor-pointer"
            />
          </div>
          <div className="text-xs text-zinc-400 space-y-1">
            <p className="font-medium text-zinc-300">Upload JPG, PNG or WEBP</p>
            <p className="text-zinc-500">
              Square images work best (at least 256x256px).
            </p>
          </div>
        </div>
      </div>

      <div className="flex gap-3 pt-2">
        <button
          type="button"
          onClick={prevStep}
          className="w-1/3 border border-zinc-800 hover:bg-zinc-900 text-zinc-300 font-medium py-2.5 rounded-lg text-sm transition-colors"
        >
          Back
        </button>
        <button
          type="button"
          onClick={nextStep}
          className="w-2/3 bg-zinc-100 hover:bg-zinc-200 text-zinc-950 font-medium py-2.5 rounded-lg text-sm transition-colors"
        >
          Continue
        </button>
      </div>
    </div>
  );
}
