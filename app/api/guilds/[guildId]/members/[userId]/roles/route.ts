import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import {
  guildMemberParamsSchema,
  updateMemberRolesSchema,
} from "@/features/memberList/validators/member";
import {
  computeBasePermissions,
  hasPermission,
  Permissions,
} from "@/features/memberList/permissions";
import { getAuthenticatedDbUser } from "@/lib/guild-auth";

export async function PUT(
  req: NextRequest,
  context: { params: Promise<{ guildId: string; userId: string }> },
) {
  try {
    const actor = await getAuthenticatedDbUser();
    if (!actor) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const rawParams = await context.params;
    const parsedParams = guildMemberParamsSchema.safeParse(rawParams);
    if (!parsedParams.success || !parsedParams.data.userId) {
      return NextResponse.json(
        { error: "Invalid parameters" },
        { status: 400 },
      );
    }
    const { guildId, userId: targetUserId } = parsedParams.data;

    const body = await req.json();
    const parsedBody = updateMemberRolesSchema.safeParse(body);
    if (!parsedBody.success) {
      return NextResponse.json({ error: "Invalid roleIds" }, { status: 400 });
    }

    const guild = await prisma.guild.findUnique({
      where: { id: guildId },
      select: { id: true, ownerId: true },
    });
    if (!guild) {
      return NextResponse.json({ error: "Guild not found" }, { status: 404 });
    }

    const [actorMembership, targetMembership, guildRoles] = await Promise.all([
      prisma.guildMember.findUnique({
        where: { guildId_userId: { guildId, userId: actor.id } },
        include: { roles: { include: { role: true } } },
      }),
      prisma.guildMember.findUnique({
        where: { guildId_userId: { guildId, userId: targetUserId } },
        include: { roles: { include: { role: true } } },
      }),
      prisma.role.findMany({
        where: { guildId, isDefault: false, isManaged: false },
      }),
    ]);

    if (!actorMembership || !targetMembership) {
      return NextResponse.json({ error: "Member not found" }, { status: 404 });
    }

    const isOwner = guild.ownerId === actor.id;
    const actorPerms = computeBasePermissions(
      isOwner,
      actorMembership.roles.map((mr) => mr.role.permissions),
    );

    if (!hasPermission(actorPerms, Permissions.MANAGE_ROLES)) {
      return NextResponse.json(
        { error: "Missing MANAGE_ROLES" },
        { status: 403 },
      );
    }

    const actorHighestPos = actorMembership.roles.reduce(
      (max, mr) => Math.max(max, mr.role.position),
      0,
    );

    // Roles the actor is permitted to assign/unassign
    const assignableRoleIds = new Set(
      guildRoles
        .filter((r) => isOwner || r.position < actorHighestPos)
        .map((r) => r.id),
    );

    // Keep any existing roles the actor does NOT control (e.g., higher/managed roles)
    const preservedRoleIds = targetMembership.roles
      .map((mr) => mr.roleId)
      .filter((id) => !assignableRoleIds.has(id));

    const requestedAssignableIds = parsedBody.data.roleIds.filter((id) =>
      assignableRoleIds.has(id),
    );

    const finalRoleIds = Array.from(
      new Set([...preservedRoleIds, ...requestedAssignableIds]),
    );

    await prisma.$transaction([
      prisma.memberRole.deleteMany({
        where: { guildId, userId: targetUserId },
      }),
      ...(finalRoleIds.length > 0
        ? [
            prisma.memberRole.createMany({
              data: finalRoleIds.map((roleId) => ({
                guildId,
                userId: targetUserId,
                roleId,
              })),
            }),
          ]
        : []),
    ]);

    return NextResponse.json({ roleIds: finalRoleIds });
  } catch (error) {
    console.error("[UPDATE_MEMBER_ROLES_ERROR]", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}
