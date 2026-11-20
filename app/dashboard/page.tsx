/* eslint-disable @typescript-eslint/no-explicit-any */
import { DiscordLayout } from "@/components/discord_sidebar/discord-layout";
import { getUserGuilds } from "@/features/guilds/actions/guild.actions";
import { mapPrismaGuildToServer } from "@/features/guilds/utils/guild-mapper";
import React, { Suspense } from "react";

function ServerFallback() {
  return <div>Loading your servers environment...</div>;
}

async function ServerFetching() {
  const result = await getUserGuilds();

  const rawGuilds = result.success && result.data ? result.data : [];
  const initialServers = rawGuilds.map((guild) => ({
    ...mapPrismaGuildToServer(guild),
    channels: (guild as any).channels,
  }));

  return <DiscordLayout initialServers={initialServers} />;
}

export default function Dashboard() {
  return (
    <div>
      <Suspense fallback={<ServerFallback />}>
        <ServerFetching />
      </Suspense>
    </div>
  );
}
