"use client";

import React from "react";
import { useUser } from "@clerk/nextjs";
import { useOnboardingStore } from "@/store/useOnboardingStore";
import { StepProfileInfo } from "@/components/onboarding/StepProfileInfo";
import { StepMediaUpload } from "@/components/onboarding/StepMediaUpload";
import { StepReviewConfirm } from "@/components/onboarding/StepReviewConfirm";

export default function OnboardingPage() {
  
  const { isLoaded, isSignedIn } = useUser();
  const currentStep = useOnboardingStore((state) => state.currentStep);

  if (!isLoaded) {
    return (
      <div className="min-h-screen bg-zinc-950 flex items-center justify-center text-zinc-400 text-sm">
        Loading session...
      </div>
    );
  }

  if (!isSignedIn) {
    return (
      <div className="min-h-screen bg-zinc-950 flex items-center justify-center text-zinc-400 text-sm">
        Please sign in to access onboarding.
      </div>
    );
  }

  return (
    <main className="min-h-screen bg-zinc-950 text-zinc-100 flex flex-col justify-center items-center px-4 py-12">
      <div className="w-full max-w-md bg-zinc-950 border border-zinc-900 p-8 rounded-2xl shadow-2xl space-y-8">
        <div className="space-y-3">
          <div className="flex items-center justify-between text-xs text-zinc-500 font-mono uppercase tracking-wider">
            <span>Step {currentStep} of 3</span>
            <span>{Math.round((currentStep / 3) * 100)}% Completed</span>
          </div>

          <div className="w-full h-1 bg-zinc-900 rounded-full overflow-hidden">
            <div
              className="h-full bg-zinc-100 transition-all duration-300 ease-out"
              style={{ width: `${(currentStep / 3) * 100}%` }}
            />
          </div>
        </div>

        <div>
          {currentStep === 1 && <StepProfileInfo />}
          {currentStep === 2 && <StepMediaUpload />}
          {currentStep === 3 && <StepReviewConfirm />}
        </div>
      </div>
    </main>
  );
}
