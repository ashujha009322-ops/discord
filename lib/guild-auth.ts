import { auth } from "@clerk/nextjs/server";
import { prisma } from "@/lib/prisma";
import {
  canModerateTarget,
  computeBasePermissions,
  hasPermission,
} from "@/features/memberList/permissions";

export async function getAuthenticatedDbUser() {
  const { userId: clerkId } = await auth();
  if (!clerkId) return null;

  return prisma.user.findUnique({
    where: { clerkId },
    select: { id: true, username: true, displayName: true },
  });
}

export async function authorizeGuildModeration(params: {
  guildId: string;
  targetUserId: string;
  requiredPermission?: bigint;
  allowSelf?: boolean;
}) {
  const {
    guildId,
    targetUserId,
    requiredPermission,
    allowSelf = false,
  } = params;

  const actor = await getAuthenticatedDbUser();
  if (!actor) {
    return { ok: false as const, status: 401, error: "Unauthorized" };
  }

  const guild = await prisma.guild.findUnique({
    where: { id: guildId },
    select: { id: true, ownerId: true },
  });
  if (!guild) {
    return { ok: false as const, status: 404, error: "Guild not found" };
  }

  const [actorMembership, targetMembership] = await Promise.all([
    prisma.guildMember.findUnique({
      where: { guildId_userId: { guildId, userId: actor.id } },
      include: { roles: { include: { role: true } } },
    }),
    prisma.guildMember.findUnique({
      where: { guildId_userId: { guildId, userId: targetUserId } },
      include: { roles: { include: { role: true } } },
    }),
  ]);

  if (!actorMembership) {
    return {
      ok: false as const,
      status: 403,
      error: "Not a member of this server",
    };
  }
  if (!targetMembership) {
    return {
      ok: false as const,
      status: 404,
      error: "Target member not found",
    };
  }

  const isActorOwner = guild.ownerId === actor.id;
  const actorPerms = computeBasePermissions(
    isActorOwner,
    actorMembership.roles.map((mr) => mr.role.permissions),
  );

  const actorHighestPos = actorMembership.roles.reduce(
    (max, mr) => Math.max(max, mr.role.position),
    0,
  );
  const targetHighestPos = targetMembership.roles.reduce(
    (max, mr) => Math.max(max, mr.role.position),
    0,
  );

  const isSelf = actor.id === targetUserId;

  if (isSelf && allowSelf) {
    return {
      ok: true as const,
      actor,
      guild,
      actorMembership,
      targetMembership,
      isActorOwner,
      actorHighestPos,
    };
  }

  if (
    requiredPermission !== undefined &&
    !hasPermission(actorPerms, requiredPermission)
  ) {
    return {
      ok: false as const,
      status: 403,
      error: "Missing required permission",
    };
  }

  const allowedByHierarchy = canModerateTarget({
    actorId: actor.id,
    targetId: targetUserId,
    guildOwnerId: guild.ownerId,
    actorHighestPosition: actorHighestPos,
    targetHighestPosition: targetHighestPos,
  });

  if (!allowedByHierarchy) {
    return {
      ok: false as const,
      status: 403,
      error: "Cannot moderate a member with an equal or higher role",
    };
  }

  return {
    ok: true as const,
    actor,
    guild,
    actorMembership,
    targetMembership,
    isActorOwner,
    actorHighestPos,
  };
}
