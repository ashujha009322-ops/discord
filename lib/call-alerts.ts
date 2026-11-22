"use client";

const DEFAULT_RINGTONE = "/ring/default.mp3";
const DEFAULT_VOLUME = 0.7;
const DEFAULT_REPEAT_DELAY = 1200;

type RingtoneOptions = {
  /** Audio file path inside public/, e.g. /ring/classic.mp3 */
  src?: string;
  /** Volume from 0 to 1 */
  volume?: number;
  /** Delay between ringtone plays, in milliseconds */
  repeatDelayMs?: number;
};

let ringtoneAudio: HTMLAudioElement | null = null;
let ringTimeout: ReturnType<typeof setTimeout> | null = null;
let currentRingSrc: string | null = null;
let isRinging = false;
let ringGeneration = 0;

function getRingtoneAudio(src: string) {
  if (typeof window === "undefined") return null;

  if (!ringtoneAudio) {
    ringtoneAudio = new Audio(src);
    ringtoneAudio.preload = "auto";
  } else if (currentRingSrc !== src) {
    ringtoneAudio.pause();
    ringtoneAudio.src = src;
    ringtoneAudio.load();
  }

  currentRingSrc = src;
  return ringtoneAudio;
}

function clearRingTimeout() {
  if (ringTimeout) {
    clearTimeout(ringTimeout);
    ringTimeout = null;
  }
}

async function playRingtonePulse(generation: number, repeatDelayMs: number) {
  if (!isRinging || generation !== ringGeneration) return;

  const audio = ringtoneAudio;
  if (!audio) return;

  try {
    audio.currentTime = 0;
    await audio.play();

    if (!isRinging || generation !== ringGeneration) {
      audio.pause();
      return;
    }

    // Wait until the current audio finishes before playing again.
    audio.onended = () => {
      if (!isRinging || generation !== ringGeneration) return;

      ringTimeout = setTimeout(() => {
        void playRingtonePulse(generation, repeatDelayMs);
      }, repeatDelayMs);
    };
  } catch (error) {
    // Autoplay may be blocked until the user interacts with the page.
    if (generation === ringGeneration) {
      console.warn("[Incoming Ringtone] Playback failed:", error);
      stopIncomingCallRingtone();
    }
  }
}

/**
 * Start incoming call ringtone.
 */
export function startIncomingCallRingtone(options: RingtoneOptions = {}) {
  stopIncomingCallRingtone();

  if (typeof window === "undefined") return;

  const {
    src = DEFAULT_RINGTONE,
    volume = DEFAULT_VOLUME,
    repeatDelayMs = DEFAULT_REPEAT_DELAY,
  } = options;

  const audio = getRingtoneAudio(src);
  if (!audio) return;

  audio.volume = Math.max(0, Math.min(1, volume));
  audio.loop = false;

  isRinging = true;

  const generation = ringGeneration;

  void playRingtonePulse(generation, Math.max(0, repeatDelayMs));
}

/**
 * Stop incoming call ringtone and reset playback.
 */
export function stopIncomingCallRingtone() {
  isRinging = false;
  ringGeneration++;

  clearRingTimeout();

  if (ringtoneAudio) {
    ringtoneAudio.onended = null;
    ringtoneAudio.pause();
    ringtoneAudio.currentTime = 0;
  }
}

/**
 * Unlock audio playback.
 * Call this from a user interaction, such as a click.
 */
export async function unlockIncomingCallAudio() {
  if (typeof window === "undefined") return;

  const audio = getRingtoneAudio(DEFAULT_RINGTONE);
  if (!audio) return;

  try {
    audio.muted = true;
    await audio.play();
    audio.pause();
    audio.currentTime = 0;
    audio.muted = false;
  } catch {
    audio.muted = false;
  }
}

/**
 * Incoming call notification.
 */
export async function triggerBackgroundCallNotification(params: {
  callerName: string;
  mode: "audio" | "video";
  onFocusCall: () => void;
}) {
  if (typeof window === "undefined" || !("Notification" in window)) {
    return;
  }

  if (document.visibilityState === "visible" && document.hasFocus()) {
    return;
  }

  try {
    let permission = Notification.permission;

    if (permission === "default") {
      permission = await Notification.requestPermission();
    }

    if (permission !== "granted") return;

    const notif = new Notification(
      `Incoming ${params.mode === "video" ? "Video" : "Voice"} Call`,
      {
        body: `${params.callerName} is calling you.`,
        tag: "incoming-p2p-call",
        requireInteraction: true,
      },
    );

    notif.onclick = () => {
      window.focus();
      params.onFocusCall();
      notif.close();
    };
  } catch (err) {
    console.error("[triggerBackgroundCallNotification]", err);
  }
}
