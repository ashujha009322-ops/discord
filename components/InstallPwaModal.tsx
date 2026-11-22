/* eslint-disable react-hooks/set-state-in-effect */
"use client";

import React, { useEffect, useState } from "react";

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed"; platform: string }>;
}

const DISMISS_STORAGE_KEY = "pwa-install-modal-dismissed-v1";

export default function InstallPwaModal() {
  const [deferredPrompt, setDeferredPrompt] =
    useState<BeforeInstallPromptEvent | null>(null);
  const [showIosGuide, setShowIosGuide] = useState(false);
  const [isOpen, setIsOpen] = useState(false);
  const [installing, setInstalling] = useState(false);

  useEffect(() => {
    if (typeof window === "undefined") return;

    // 1. Check if already running as an installed PWA
    const isStandalone =
      window.matchMedia("(display-mode: standalone)").matches ||
      (window.navigator as unknown as { standalone?: boolean }).standalone ===
        true;

    if (isStandalone) return;

    // 2. Check if the user already dismissed the prompt earlier
    try {
      if (window.localStorage.getItem(DISMISS_STORAGE_KEY) === "true") {
        return;
      }
    } catch {
      // Ignore storage access errors in private mode
    }

    // 3. Detect iPhone / iPad Safari (no beforeinstallprompt support)
    const ua = window.navigator.userAgent.toLowerCase();
    const isIos = /iphone|ipad|ipod/.test(ua);
    const isSafari = /safari/.test(ua) && !/crios|fxios|edgios/.test(ua);

    if (isIos && isSafari) {
      setShowIosGuide(true);
      setIsOpen(true);
      return;
    }

    // 4. Listen for Android / Desktop Chrome install prompt
    const handleBeforeInstallPrompt = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e as BeforeInstallPromptEvent);
      setIsOpen(true);
    };

    const handleAppInstalled = () => {
      setIsOpen(false);
      setDeferredPrompt(null);
    };

    window.addEventListener("beforeinstallprompt", handleBeforeInstallPrompt);
    window.addEventListener("appinstalled", handleAppInstalled);

    return () => {
      window.removeEventListener(
        "beforeinstallprompt",
        handleBeforeInstallPrompt,
      );
      window.removeEventListener("appinstalled", handleAppInstalled);
    };
  }, []);

  const handleDismiss = () => {
    setIsOpen(false);
    try {
      window.localStorage.setItem(DISMISS_STORAGE_KEY, "true");
    } catch {
      // Ignore storage errors
    }
  };

  const handleInstallClick = async () => {
    if (!deferredPrompt) return;
    setInstalling(true);
    try {
      await deferredPrompt.prompt();
      const choice = await deferredPrompt.userChoice;
      if (choice.outcome === "accepted") {
        setIsOpen(false);
        setDeferredPrompt(null);
      }
    } catch (err) {
      console.error("[PWA install prompt failed]", err);
    } finally {
      setInstalling(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="pwa-install-title"
      className="fixed inset-0 z-50 flex items-end justify-center bg-black/50 p-4 sm:items-center"
    >
      <div className="w-full max-w-sm rounded-2xl border bg-white p-6 shadow-xl">
        <h2
          id="pwa-install-title"
          className="text-lg font-semibold text-neutral-900"
        >
          Install App on Your Phone
        </h2>
        <p className="mt-2 text-sm text-neutral-600">
          Install this app to your Home Screen for faster access and reliable
          incoming call notifications even when your browser is closed.
        </p>

        {showIosGuide ? (
          <div className="mt-4 rounded-xl bg-neutral-100 p-3.5 text-sm text-neutral-800">
            <p className="font-medium">How to install on iPhone / iPad:</p>
            <ol className="mt-2 list-inside list-decimal space-y-1 text-xs text-neutral-700">
              <li>
                Tap the <span className="font-semibold">Share</span> button at
                the bottom of Safari.
              </li>
              <li>
                Scroll down and tap{" "}
                <span className="font-semibold">Add to Home Screen</span>.
              </li>
              <li>
                Open the app from your Home Screen and tap{" "}
                <span className="font-semibold">Enable Call Alerts</span>.
              </li>
            </ol>
          </div>
        ) : null}

        <div className="mt-6 flex justify-end gap-3">
          <button
            type="button"
            onClick={handleDismiss}
            className="rounded-lg border px-4 py-2 text-sm font-medium text-neutral-700 hover:bg-neutral-100"
          >
            Not Now
          </button>

          {!showIosGuide && deferredPrompt && (
            <button
              type="button"
              onClick={() => void handleInstallClick()}
              disabled={installing}
              className="rounded-lg bg-neutral-900 px-4 py-2 text-sm font-medium text-white hover:bg-neutral-800 disabled:opacity-50"
            >
              {installing ? "Installing..." : "Install App"}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
