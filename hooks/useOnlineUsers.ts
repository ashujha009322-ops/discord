/* eslint-disable react-hooks/set-state-in-effect */
"use client";

import { useEffect, useState } from "react";
import { createClient } from "@supabase/supabase-js";

interface UseOnlineUsersResult {
  onlineUserIds: Set<string>;
  presenceError: string | null;
}

export function useOnlineUsers(
  currentUserId: string | null,
): UseOnlineUsersResult {
  const [onlineUserIds, setOnlineUserIds] = useState<Set<string>>(new Set());
  const [presenceError, setPresenceError] = useState<string | null>(null);

  useEffect(() => {
    if (!currentUserId) return;

    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

    if (!supabaseUrl || !supabaseAnonKey) {
      setPresenceError("Missing Supabase Realtime environment variables.");
      return;
    }

    const supabase = createClient(supabaseUrl, supabaseAnonKey);
    const channel = supabase.channel("calling-presence", {
      config: { presence: { key: currentUserId } },
    });

    channel.on("presence", { event: "sync" }, () => {
      try {
        const state = channel.presenceState();
        const ids = new Set<string>(Object.keys(state));
        ids.delete(currentUserId);
        setOnlineUserIds(ids);
        setPresenceError(null);
      } catch (err) {
        console.error("[Presence sync error]", err);
        setPresenceError("Unable to sync online status.");
      }
    });

    channel.subscribe(async (status) => {
      if (status === "SUBSCRIBED") {
        try {
          await channel.track({ onlineAt: Date.now() });
        } catch (err) {
          console.error("[Presence track error]", err);
          setPresenceError("Could not publish your online status.");
        }
      } else if (status === "CHANNEL_ERROR" || status === "TIMED_OUT") {
        setPresenceError("Live presence connection interrupted.");
      }
    });

    return () => {
      void supabase.removeChannel(channel);
    };
  }, [currentUserId]);

  return { onlineUserIds, presenceError };
}
