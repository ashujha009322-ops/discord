"use client";

import { useCallback, useEffect, useRef, useState } from "react";

export type CopyStatus = "idle" | "copied" | "failed";

/**
 * Copies text to the clipboard with a fallback.
 *
 * 1. `navigator.clipboard.writeText`: needs a secure context (https or localhost).
 * 2. Fallback: select the given input and run `document.execCommand("copy")`.
 *    Deprecated, but still the only option on plain-http origins such as a LAN IP.
 *
 * If both fail the status becomes "failed" and the input stays selected, so the user
 * can press Ctrl/Cmd+C themselves.
 */
export function useCopyToClipboard(resetAfterMs = 2000) {
  const [status, setStatus] = useState<CopyStatus>("idle");
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(
    () => () => {
      if (timerRef.current) clearTimeout(timerRef.current);
    },
    [],
  );

  const copy = useCallback(
    async (text: string, fallbackInput?: HTMLInputElement | null) => {
      let ok = false;

      try {
        if (navigator.clipboard?.writeText) {
          await navigator.clipboard.writeText(text);
          ok = true;
        }
      } catch {
        ok = false; // permission denied or insecure context: try the fallback
      }

      if (!ok && fallbackInput) {
        try {
          fallbackInput.focus();
          fallbackInput.select();
          ok = document.execCommand("copy");
        } catch {
          ok = false;
        }
      }

      if (timerRef.current) clearTimeout(timerRef.current);
      setStatus(ok ? "copied" : "failed");
      // Leave the failure hint up longer: the user has to act on it.
      timerRef.current = setTimeout(
        () => setStatus("idle"),
        ok ? resetAfterMs : resetAfterMs * 3,
      );
      return ok;
    },
    [resetAfterMs],
  );

  return { status, copy };
}
