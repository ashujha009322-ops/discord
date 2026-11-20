/* eslint-disable @typescript-eslint/no-explicit-any */
"use client";

import React, { useState } from "react";
import { useRouter } from "next/navigation";
import { useOnboardingStore } from "@/store/useOnboardingStore";
import { completeOnboarding } from "@/actions/onboarding";

export function StepReviewConfirm() {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);

  const {
    displayName,
    username,
    bio,
    avatarFile,
    avatarPreview,
    bannerFile,
    bannerPreview,
    isSubmitting,
    setIsSubmitting,
    prevStep,
  } = useOnboardingStore();

  const handleFinish = async () => {
    setIsSubmitting(true);
    setError(null);

    try {
      const formData = new FormData();
      formData.append("displayName", displayName);
      formData.append("username", username);
      formData.append("bio", bio);
      if (avatarFile) formData.append("avatar", avatarFile);
      if (bannerFile) formData.append("banner", bannerFile);

      const res = await completeOnboarding(formData);

      if (!res.success) {
        throw new Error(res.error);
      }

      router.push("/dashboard");
    } catch (err: any) {
      setError(err.message || "An unexpected error occurred during onboarding");
      setIsSubmitting(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="space-y-1">
        <h2 className="text-xl font-semibold text-zinc-100 tracking-tight">
          Review Profile
        </h2>
        <p className="text-sm text-zinc-400">
          Confirm your details before completing setup.
        </p>
      </div>

      <div className="bg-zinc-900 border border-zinc-800 rounded-xl overflow-hidden">
        <div className="h-28 bg-zinc-800 relative">
          {bannerPreview && (
            <img
              src={bannerPreview}
              alt="Banner"
              className="w-full h-full object-cover"
            />
          )}
        </div>
        <div className="px-5 pb-5 pt-0 relative">
          <div className="-mt-10 mb-3 flex items-end">
            <div className="w-20 h-20 rounded-full border-4 border-zinc-900 bg-zinc-800 overflow-hidden shrink-0">
              {avatarPreview ? (
                <img
                  src={avatarPreview}
                  alt="Avatar"
                  className="w-full h-full object-cover"
                />
              ) : (
                <div className="w-full h-full flex items-center justify-center text-zinc-500 font-medium text-lg">
                  {displayName.charAt(0).toUpperCase()}
                </div>
              )}
            </div>
          </div>
          <div>
            <h3 className="text-lg font-bold text-zinc-100">{displayName}</h3>
            <p className="text-xs text-zinc-400 font-mono">{username}</p>
            {bio && (
              <p className="mt-3 text-sm text-zinc-300 line-clamp-3">{bio}</p>
            )}
          </div>
        </div>
      </div>

      {error && <p className="text-xs text-rose-400">{error}</p>}

      <div className="flex gap-3 pt-2">
        <button
          type="button"
          disabled={isSubmitting}
          onClick={prevStep}
          className="w-1/3 border border-zinc-800 hover:bg-zinc-900 text-zinc-300 font-medium py-2.5 rounded-lg text-sm transition-colors disabled:opacity-50"
        >
          Back
        </button>
        <button
          type="button"
          disabled={isSubmitting}
          onClick={handleFinish}
          className="w-2/3 bg-zinc-100 hover:bg-zinc-200 text-zinc-950 font-medium py-2.5 rounded-lg text-sm transition-colors disabled:opacity-50"
        >
          {isSubmitting ? "Saving Profile..." : "Complete Setup"}
        </button>
      </div>
    </div>
  );
}
