"use client";

import React, { useState } from "react";
import { useOnboardingStore } from "@/store/useOnboardingStore";
import { checkUsernameAvailability } from "@/actions/onboarding";

export function StepProfileInfo() {
  const {
    displayName,
    username,
    bio,
    setDisplayName,
    setUsername,
    setBio,
    nextStep,
  } = useOnboardingStore();

  const [usernameError, setUsernameError] = useState<string | null>(null);
  const [isChecking, setIsChecking] = useState(false);

  const handleDisplayNameChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setDisplayName(e.target.value);
    if (usernameError) setUsernameError(null);
  };

  const handleUsernameChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    let val = e.target.value;
    if (!val.startsWith("@") && val.length > 0) {
      val = `@${val}`;
    }
    setUsername(val);
    if (usernameError) setUsernameError(null);
  };

  const handleNext = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!displayName.trim()) {
      setUsernameError("Display name is required");
      return;
    }
    if (!username.trim() || username === "@") {
      setUsernameError("Username is required");
      return;
    }

    setIsChecking(true);
    const { isAvailable } = await checkUsernameAvailability(username);
    setIsChecking(false);

    if (!isAvailable) {
      setUsernameError("This username is already taken");
      return;
    }

    nextStep();
  };

  return (
    <form onSubmit={handleNext} className="space-y-6">
      <div className="space-y-1">
        <h2 className="text-xl font-semibold text-zinc-100 tracking-tight">
          Personal Details
        </h2>
        <p className="text-sm text-zinc-400">
          Tell us how youd like to appear across the platform.
        </p>
      </div>

      <div className="space-y-4">
        <div>
          <label className="block text-xs font-medium text-zinc-300 uppercase tracking-wider mb-1.5">
            Display Name
          </label>
          <input
            type="text"
            required
            maxLength={80}
            value={displayName}
            onChange={handleDisplayNameChange}
            placeholder="Jane Doe"
            className="w-full bg-zinc-900 border border-zinc-800 rounded-lg px-3.5 py-2.5 text-zinc-100 placeholder-zinc-500 focus:outline-none focus:border-zinc-500 text-sm transition-colors"
          />
        </div>

        <div>
          <label className="block text-xs font-medium text-zinc-300 uppercase tracking-wider mb-1.5">
            Username
          </label>
          <input
            type="text"
            required
            maxLength={32}
            value={username}
            onChange={handleUsernameChange}
            placeholder="@janedoe"
            className="w-full bg-zinc-900 border border-zinc-800 rounded-lg px-3.5 py-2.5 text-zinc-100 placeholder-zinc-500 focus:outline-none focus:border-zinc-500 text-sm font-mono transition-colors"
          />
          {usernameError && (
            <p className="mt-1.5 text-xs text-rose-400">{usernameError}</p>
          )}
        </div>

        <div>
          <div className="flex justify-between mb-1.5">
            <label className="text-xs font-medium text-zinc-300 uppercase tracking-wider">
              Bio
            </label>
            <span className="text-xs text-zinc-500">{bio.length}/500</span>
          </div>
          <textarea
            rows={3}
            maxLength={500}
            value={bio}
            onChange={(e) => setBio(e.target.value)}
            placeholder="A short intro about yourself..."
            className="w-full bg-zinc-900 border border-zinc-800 rounded-lg px-3.5 py-2.5 text-zinc-100 placeholder-zinc-500 focus:outline-none focus:border-zinc-500 text-sm resize-none transition-colors"
          />
        </div>
      </div>

      <button
        type="submit"
        disabled={isChecking}
        className="w-full bg-zinc-100 hover:bg-zinc-200 text-zinc-950 font-medium py-2.5 rounded-lg text-sm transition-colors disabled:opacity-50"
      >
        {isChecking ? "Checking availability..." : "Continue"}
      </button>
    </form>
  );
}
