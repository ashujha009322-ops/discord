import "server-only";

import { prisma } from "@/lib/prisma"; // CONFIRM: path of your Prisma client singleton

import { generateInviteCode } from "./code";
import {
  INVITE_CODE_MAX_ATTEMPTS,
  INVITE_REUSE_MIN_REMAINING_MS,
} from "./constants";

/** Fields returned by every invite query. No joins: callers add what they need. */
const inviteSelect = {
  id: true,
  code: true,
  guildId: true,
  channelId: true,
  expiresAt: true,
  maxUses: true,
  uses: true,
  createdAt: true,
} as const;

const channelSelect = { id: true, name: true } as const;

export type InviteRecord = NonNullable<
  Awaited<ReturnType<typeof findReusableInvite>>
>;

/**
 * Prisma reports unique-constraint violations as P2002. The only unique column
 * besides the UUID primary key is `code`, so any P2002 on create means a code
 * collision. (We deliberately do not inspect `meta.target`: its shape differs
 * between driver adapters.)
 */
function isUniqueViolation(error: unknown): boolean {
  return (
    typeof error === "object" &&
    error !== null &&
    "code" in error &&
    (error as { code?: unknown }).code === "P2002"
  );
}

/** Owner-only policy: true when `userId` owns the guild. */
export async function isGuildOwner(
  guildId: string,
  userId: string,
): Promise<boolean> {
  const guild = await prisma.guild.findFirst({
    where: { id: guildId, ownerId: userId },
    select: { id: true },
  });
  return guild !== null;
}

/**
 * Decides which channel an invite lands in.
 *
 * 1. The channel the user is currently viewing, if it belongs to this guild, is not
 *    private (a new member could not see it) and is a type people can land in.
 * 2. Otherwise the first public text or announcement channel by position.
 *
 * Returns null when the guild has no eligible channel; the caller must handle that.
 */
export async function resolveLandingChannel(
  guildId: string,
  preferredChannelId?: string | null,
) {
  if (preferredChannelId) {
    const preferred = await prisma.channel.findFirst({
      where: {
        id: preferredChannelId,
        guildId,
        isPrivate: false,
        type: { in: ["TEXT", "ANNOUNCEMENT", "FORUM", "VOICE"] },
      },
      select: channelSelect,
    });
    if (preferred) return preferred;
  }

  return prisma.channel.findFirst({
    where: {
      guildId,
      isPrivate: false,
      type: { in: ["TEXT", "ANNOUNCEMENT"] },
    },
    orderBy: [{ position: "asc" }, { createdAt: "asc" }],
    select: channelSelect,
  });
}

/**
 * Most recent invite from this creator for this guild and channel that is still
 * safe to hand out again: not revoked, unlimited uses, and with enough lifetime left.
 * `now` is injectable so the rule can be unit tested.
 */
export async function findReusableInvite(params: {
  guildId: string;
  channelId: string;
  createdById: string;
  now?: Date;
}) {
  const now = params.now ?? new Date();
  return prisma.invite.findFirst({
    where: {
      guildId: params.guildId,
      channelId: params.channelId,
      createdById: params.createdById,
      targetType: "GUILD",
      revokedAt: null,
      maxUses: null,
      expiresAt: {
        gt: new Date(now.getTime() + INVITE_REUSE_MIN_REMAINING_MS),
      },
    },
    orderBy: { createdAt: "desc" },
    select: inviteSelect,
  });
}

/** Inserts a GUILD invite, retrying with a fresh code if the code collides. */
export async function createInviteRecord(input: {
  guildId: string;
  channelId: string;
  createdById: string;
  expiresAt: Date | null;
  maxUses: number | null;
}) {
  for (let attempt = 1; attempt <= INVITE_CODE_MAX_ATTEMPTS; attempt++) {
    try {
      return await prisma.invite.create({
        data: {
          code: generateInviteCode(),
          targetType: "GUILD",
          guildId: input.guildId,
          channelId: input.channelId,
          createdById: input.createdById,
          expiresAt: input.expiresAt,
          maxUses: input.maxUses,
        },
        select: inviteSelect,
      });
    } catch (error) {
      if (!isUniqueViolation(error)) throw error;
      // Code collision: loop and try a new code.
    }
  }
  throw new Error(
    `Could not generate a unique invite code after ${INVITE_CODE_MAX_ATTEMPTS} attempts.`,
  );
}

export async function findUserIdByClerkId(
  clerkId: string,
): Promise<string | null> {
  const user = await prisma.user.findUnique({
    where: { clerkId },
    select: { id: true },
  });
  return user?.id ?? null;
}

/** Number of invites this user has created since `since`. Backs the creation throttle. */
export async function countInvitesCreatedSince(
  userId: string,
  since: Date,
): Promise<number> {
  return prisma.invite.count({
    where: { createdById: userId, createdAt: { gt: since } },
  });
}
