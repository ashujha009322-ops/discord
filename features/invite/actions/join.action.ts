import "server-only";

import { prisma } from "@/lib/prisma"; // CONFIRM: same path as in queries.ts

import { isUniqueViolation } from "@/components/invitemodal/isUniqueViolation";
import {
  evaluateInviteStatus,
  toFailureReason,
} from "@/components/invitemodal/evaluateInviteStatus";
import type { InviteStatus, JoinFailureReason } from "@/features/invite/types";

const inviteSelect = {
  id: true,
  guildId: true,
  channelId: true,
  targetType: true,
  expiresAt: true,
  maxUses: true,
  uses: true,
  revokedAt: true,
} as const;

export type InvitePreview = {
  status: InviteStatus;
  /** Only present for a valid invite: nothing about the server leaks otherwise. */
  guild: { id: string; name: string; memberCount: number } | null;
  channelId: string | null;
};

export type JoinEligibility = "already_member" | "banned" | "eligible";

export type JoinResult =
  | { status: "joined"; guildId: string; channelId: string | null }
  | { status: "already_member"; guildId: string; channelId: string | null }
  | { status: "rejected"; reason: JoinFailureReason };

/** Thrown inside the transaction to abort it and roll every write back. */
class JoinRejection extends Error {
  readonly reason: JoinFailureReason;
  constructor(reason: JoinFailureReason) {
    super(`Join rejected: ${reason}`);
    this.name = "JoinRejection";
    this.reason = reason;
  }
}

/**
 * Read-only view of an invite for the landing page. Never mutates anything, so link
 * previews, crawlers and prefetchers cannot consume uses.
 */

export async function getInvitePreview(
  code: string,
  now?: Date,
): Promise<InvitePreview> {
  const currentTime = now ?? new Date();

  const invite = await prisma.invite.findUnique({
    where: { code },
    select: inviteSelect,
  });

  const status = evaluateInviteStatus(invite, currentTime);

  if (status !== "valid" || !invite || !invite.guildId) {
    return {
      status,
      guild: null,
      channelId: null,
    };
  }

  const [guild, memberCount] = await Promise.all([
    prisma.guild.findFirst({
      where: { id: invite.guildId },
      select: {
        id: true,
        name: true,
      },
    }),

    prisma.guildMember.count({
      where: {
        guildId: invite.guildId,
      },
    }),
  ]);

  if (!guild) {
    return {
      status: "not_found",
      guild: null,
      channelId: null,
    };
  }

  return {
    status,
    guild: {
      id: guild.id,
      name: guild.name,
      memberCount,
    },
    channelId: invite.channelId,
  };
}

/** Whether this user may join the guild. A ban wins over membership. */
export async function getJoinEligibility(
  guildId: string,
  userId: string,
): Promise<JoinEligibility> {
  const [ban, member] = await Promise.all([
    prisma.guildBan.findFirst({
      where: { guildId, userId },
      select: { userId: true },
    }),
    prisma.guildMember.findFirst({
      where: { guildId, userId },
      select: { userId: true },
    }),
  ]);
  if (ban) return "banned";
  return member ? "already_member" : "eligible";
}

/**
 * Joins `userId` to the invite's guild, atomically.
 *
 * Everything happens in ONE transaction: membership, default role, audit entry and
 * the invite's use counter. If any step fails, all of it rolls back.
 *
 * The use counter is consumed by a single conditional UPDATE that re-checks
 * revoked, expired and max-uses in the database. Under concurrency, Postgres makes
 * competing updates wait on the row lock and re-evaluate the WHERE clause against the
 * latest committed row, so `uses` can never exceed `maxUses` (the CHECK constraint from
 * Stage 2 backs this up). Prisma cannot compare two columns in `where`, hence raw SQL.
 *
 * The UPDATE runs last so the hot invite row stays locked for as short a time as possible.
 */

export async function joinGuildWithInvite(params: {
  code: string;
  userId: string;
  now?: Date;
}): Promise<JoinResult> {
  const { code, userId, now = new Date() } = params;

  try {
    return await prisma.$transaction(async (tx): Promise<JoinResult> => {
      const invite = await tx.invite.findUnique({
        where: { code },
        select: inviteSelect,
      });

      const status = evaluateInviteStatus(invite, now);

      if (status !== "valid") {
        throw new JoinRejection(toFailureReason(status));
      }

      if (!invite?.guildId) {
        throw new JoinRejection("NOT_FOUND");
      }

      const guildId = invite.guildId;

      // Check whether the user is banned.
      const ban = await tx.guildBan.findFirst({
        where: { guildId, userId },
        select: { userId: true },
      });

      if (ban) {
        throw new JoinRejection("BANNED");
      }

      // Already a member: succeed without consuming an invite use.
      const existing = await tx.guildMember.findFirst({
        where: { guildId, userId },
        select: { userId: true },
      });

      if (existing) {
        return {
          status: "already_member",
          guildId,
          channelId: invite.channelId,
        };
      }

      // Create guild membership.
      await tx.guildMember.create({
        data: {
          guildId,
          userId,
        },
      });

      // Assign the guild's default role if one exists.
      const defaultRole = await tx.role.findFirst({
        where: {
          guildId,
          isDefault: true,
        },
        select: {
          id: true,
        },
      });

      if (defaultRole) {
        await tx.memberRole.create({
          data: {
            guildId,
            userId,
            roleId: defaultRole.id,
          },
        });
      }

      // Create audit log without storing the invite code.
      await tx.auditLog.create({
        data: {
          guildId,
          actorId: userId,
          action: "MEMBER_JOIN",
          targetId: userId,
          metadata: {
            inviteId: invite.id,
            via: "invite",
          },
        },
      });

      // Atomically consume one invite use.
      const consumed = await tx.$executeRaw`
        UPDATE "Invite"
        SET "uses" = "uses" + 1
        WHERE "id" = ${invite.id}::uuid
          AND "revokedAt" IS NULL
          AND (
            "expiresAt" IS NULL
            OR "expiresAt" > ${now}
          )
          AND (
            "maxUses" IS NULL
            OR "uses" < "maxUses"
          )
      `;

      if (consumed !== 1) {
        // Invite became invalid or reached its usage limit.
        // Throwing rolls back all membership changes.
        const fresh = await tx.invite.findUnique({
          where: { code },
          select: inviteSelect,
        });

        const freshStatus = evaluateInviteStatus(fresh, now);

        throw new JoinRejection(
          toFailureReason(freshStatus === "valid" ? "expired" : freshStatus),
        );
      }

      return {
        status: "joined",
        guildId,
        channelId: invite.channelId,
      };
    });
  } catch (error) {
    if (error instanceof JoinRejection) {
      return {
        status: "rejected",
        reason: error.reason,
      };
    }

    // Handle concurrent duplicate membership creation.
    if (isUniqueViolation(error)) {
      const invite = await prisma.invite.findUnique({
        where: { code },
        select: {
          guildId: true,
          channelId: true,
        },
      });

      if (invite?.guildId) {
        const member = await prisma.guildMember.findFirst({
          where: {
            guildId: invite.guildId,
            userId,
          },
          select: {
            userId: true,
          },
        });

        if (member) {
          return {
            status: "already_member",
            guildId: invite.guildId,
            channelId: invite.channelId,
          };
        }
      }
    }

    throw error;
  }
}
