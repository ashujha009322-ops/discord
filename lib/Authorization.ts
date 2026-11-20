import "server-only";

import { auth } from "@clerk/nextjs/server";
import { prisma } from "@/lib/prisma";
import { getCurrentUser, type CurrentUser } from "./Current-User";
import { ActionError } from "../features/messages/Errors";
import {
  messageSelect,
  type MessageRow,
} from "../features/messages/messageSelect";
import type { MessageActor } from "../features/messages/Permissions";

/** Resolves the Clerk session to the local user, or throws an ActionError. */
export async function requireCurrentUser(): Promise<CurrentUser> {
  const result = await getCurrentUser();

  if (!result.ok) {
    throw result.reason === "UNAUTHENTICATED"
      ? new ActionError("UNAUTHENTICATED", "You must be signed in.")
      : new ActionError("USER_NOT_FOUND", "User profile not found.");
  }

  return result.user;
}

export type ChannelAccess = MessageActor & {
  user: CurrentUser;
  channelId: string;
  guildId: string;
  /** Set while the member is timed out; null otherwise. */
  timeoutUntil: Date | null;
};

function channelAccessSelect(clerkId: string) {
  return {
    id: true,
    guildId: true,
    type: true,
    isPrivate: true,
    guild: {
      select: {
        id: true,
        ownerId: true,
        members: {
          where: { user: { clerkId } },
          select: {
            timeoutUntil: true,
            user: {
              select: {
                id: true,
                clerkId: true,
                username: true,
                displayName: true,
                avatarKey: true,
              },
            },
          },
        },
      },
    },
  } as const;
}

type ChannelAccessRow = {
  id: string;
  guildId: string | null;
  type: string;
  isPrivate: boolean;
  guild: {
    id: string;
    ownerId: string;
    members: {
      timeoutUntil: Date | null;
      user: CurrentUser;
    }[];
  } | null;
};

async function evaluateChannelAccess(
  channel: ChannelAccessRow | null,
): Promise<ChannelAccess> {
  if (!channel || !channel.guild || !channel.guildId) {
    // Distinguish "signed-in user has no local profile" from "channel missing"
    await requireCurrentUser();
    throw new ActionError("NOT_FOUND", "Channel not found.");
  }

  const membership = channel.guild.members[0];
  if (!membership) {
    // Verify the caller actually has a local User profile before reporting NOT_A_MEMBER
    await requireCurrentUser();
    throw new ActionError(
      "NOT_A_MEMBER",
      "You are not a member of this server.",
    );
  }

  if (channel.type !== "TEXT") {
    throw new ActionError(
      "UNSUPPORTED_CHANNEL",
      "Messaging is only available in text channels.",
    );
  }

  const { user } = membership;
  const isGuildOwner = channel.guild.ownerId === user.id;

  if (channel.isPrivate && !isGuildOwner) {
    throw new ActionError(
      "FORBIDDEN",
      "You don't have access to this channel.",
    );
  }

  return {
    user,
    userId: user.id,
    isGuildOwner,
    channelId: channel.id,
    guildId: channel.guildId,
    timeoutUntil: membership.timeoutUntil,
  };
}

/**
 * Single entry point for "may this user touch this channel's messages?".
 * Loads the channel, guild owner, caller's membership, and caller's local
 * `User` profile in a single database query.
 *
 * Checks, in order:
 *   1. caller is authenticated (via local Clerk JWT)
 *   2. channel exists and caller has a local profile + guild membership
 *   3. channel is a guild TEXT channel (DM / forum / thread / ... rejected for now)
 *   4. private channels are owner-only until permission overwrites are wired up
 */
export async function requireChannelAccess(
  channelId: string,
): Promise<ChannelAccess> {
  const t0 = performance.now();
  const { userId: clerkId } = await auth();
  if (!clerkId) {
    throw new ActionError("UNAUTHENTICATED", "You must be signed in.");
  }

  const channel = await prisma.channel.findUnique({
    where: { id: channelId },
    select: channelAccessSelect(clerkId),
  });

  const access = await evaluateChannelAccess(channel);

  if (process.env.NODE_ENV === "development") {
    console.info(
      `[auth] requireChannelAccess timing: ${(performance.now() - t0).toFixed(0)}ms`,
    );
  }

  return access;
}

/** Call before creating a message. Edits and deletes are still allowed while timed out. */
export function assertCanSend(access: ChannelAccess, now: Date = new Date()) {
  if (access.timeoutUntil && access.timeoutUntil > now) {
    throw new ActionError(
      "TIMED_OUT",
      "You are timed out and cannot send messages right now.",
    );
  }
}

export type MessageAccess = {
  access: ChannelAccess;
  message: MessageRow;
};

/**
 * For edit / delete: loads the message AND proves the caller may touch its
 * channel in a single database query.
 */
export async function requireMessageAccess(
  messageId: string,
): Promise<MessageAccess> {
  const { userId: clerkId } = await auth();
  if (!clerkId) {
    throw new ActionError("UNAUTHENTICATED", "You must be signed in.");
  }

  const row = await prisma.message.findUnique({
    where: { id: messageId, deletedAt: null },
    select: {
      ...messageSelect,
      channel: {
        select: channelAccessSelect(clerkId),
      },
    },
  });

  if (!row) {
    await requireCurrentUser();
    throw new ActionError("NOT_FOUND", "Message not found.");
  }

  const { channel, ...message } = row;
  const access = await evaluateChannelAccess(channel);

  return { access, message };
}
