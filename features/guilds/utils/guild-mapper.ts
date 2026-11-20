/* eslint-disable @typescript-eslint/no-explicit-any */
import { Server } from "@/components/discord_sidebar/types"; // adjust path to your types file if needed

export function mapPrismaGuildToServer(guild: any) {
  const textChannels =
    guild.channels?.filter(
      (ch: any) => ch.type === "TEXT" || ch.type === "ANNOUNCEMENT",
    ) || [];
  const voiceChannels =
    guild.channels?.filter((ch: any) => ch.type === "VOICE") || [];

  const categories = [];

  if (textChannels.length > 0) {
    categories.push({
      id: "cat-text",
      name: "Text Channels",
      channels: textChannels.map((ch: any) => ({
        id: ch.id,
        name: ch.name || "general",
        type: ch.type.toLowerCase(),
      })),
    });
  }

  if (voiceChannels.length > 0) {
    categories.push({
      id: "cat-voice",
      name: "Voice Channels",
      channels: voiceChannels.map((ch: any) => ({
        id: ch.id,
        name: ch.name || "general",
        type: ch.type.toLowerCase(),
      })),
    });
  }

  // Fallback category if the server has no channels yet
  if (categories.length === 0) {
    categories.push({
      id: "cat-default",
      name: "Text Channels",
      channels: [],
    });
  }

  return {
    id: guild.id,
    name: guild.name,
    iconUrl: guild.iconKey ? `/api/storage/${guild.iconKey}` : undefined,
    unreadCount: 0,
    hasUnread: false,
    hasAudioActivity: false,
    categories,
  };
}
