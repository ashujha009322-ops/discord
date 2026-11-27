import { NextRequest, NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { prisma } from "@/lib/prisma";
import { guildMemberParamsSchema } from "@/features/memberList/validators/member";
import { resolveStorageUrl } from "@/features/memberList/storage";
import {
  computeBasePermissions,
  hasPermission,
  Permissions,
} from "@/features/memberList/permissions";
import {
  GuildMemberDTO,
  GuildMembersResponse,
  RelationshipStatus,
} from "@/features/memberList/member";

export async function GET(
  _req: NextRequest,
  context: { params: Promise<{ guildId: string }> },
) {
  try {
    const { userId: clerkId } = await auth();
    if (!clerkId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const rawParams = await context.params;
    const parsed = guildMemberParamsSchema.safeParse(rawParams);
    if (!parsed.success) {
      return NextResponse.json(
        { error: "Invalid guild ID", details: parsed.error.flatten() },
        { status: 400 },
      );
    }
    const { guildId } = parsed.data;

    // 1. Resolve current DB user
    const currentUser = await prisma.user.findUnique({
      where: { clerkId },
      select: { id: true },
    });
    if (!currentUser) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    // 2. Verify guild exists & current user is a member
    const guild = await prisma.guild.findUnique({
      where: { id: guildId },
      select: { id: true, ownerId: true },
    });
    if (!guild) {
      return NextResponse.json({ error: "Guild not found" }, { status: 404 });
    }

    const viewerMembership = await prisma.guildMember.findUnique({
      where: {
        guildId_userId: { guildId, userId: currentUser.id },
      },
      include: {
        roles: { include: { role: true } },
      },
    });
    if (!viewerMembership) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    // 3. Fetch all guild members + viewer relationships in parallel
    const [rawMembers, relationships] = await Promise.all([
      prisma.guildMember.findMany({
        where: { guildId },
        include: {
          user: {
            select: {
              id: true,
              username: true,
              displayName: true,
              avatarKey: true,
              isBot: true,
            },
          },
          roles: {
            include: {
              role: {
                select: {
                  id: true,
                  name: true,
                  color: true,
                  position: true,
                  isDefault: true,
                },
              },
            },
          },
        },
        orderBy: [{ joinedAt: "asc" }],
      }),
      prisma.relationship.findMany({
        where: {
          OR: [{ senderId: currentUser.id }, { receiverId: currentUser.id }],
        },
      }),
    ]);

    // 4. Index relationships by target userId
    const relationshipMap = new Map<string, RelationshipStatus>();
    for (const rel of relationships) {
      const isSender = rel.senderId === currentUser.id;
      const otherId = isSender ? rel.receiverId : rel.senderId;

      if (rel.type === "BLOCKED") {
        relationshipMap.set(otherId, "BLOCKED");
      } else if (rel.type === "FRIEND") {
        relationshipMap.set(otherId, "FRIEND");
      } else if (rel.type === "FRIEND_REQUEST") {
        relationshipMap.set(
          otherId,
          isSender ? "PENDING_SENT" : "PENDING_RECEIVED",
        );
      }
    }

    // 5. Compute viewer permissions
    const isViewerOwner = guild.ownerId === currentUser.id;
    const viewerPermsBitfield = computeBasePermissions(
      isViewerOwner,
      viewerMembership.roles.map((mr) => mr.role.permissions),
    );
    const viewerHighestRolePosition = viewerMembership.roles.reduce(
      (max, mr) => Math.max(max, mr.role.position),
      0,
    );

    // 6. Shape and sort members (Owner / Highest Role first, then alphabetical)
    const members: GuildMemberDTO[] = rawMembers
      .map((m) => {
        const sortedRoles = m.roles
          .map((mr) => mr.role)
          .filter((r) => !r.isDefault)
          .sort((a, b) => b.position - a.position)
          .map(({ id, name, color, position }) => ({
            id,
            name,
            color,
            position,
          }));

        const highestRolePosition = sortedRoles[0]?.position ?? 0;
        const effectiveName =
          m.nickname || m.user.displayName || m.user.username;

        const relationshipStatus: RelationshipStatus =
          m.userId === currentUser.id
            ? "SELF"
            : (relationshipMap.get(m.userId) ?? "NONE");

        return {
          userId: m.userId,
          guildId: m.guildId,
          username: m.user.username,
          displayName: m.user.displayName,
          nickname: m.nickname,
          effectiveName,
          avatarUrl: resolveStorageUrl(m.user.avatarKey),
          isBot: m.user.isBot,
          isOwner: guild.ownerId === m.userId,
          joinedAt: m.joinedAt.toISOString(),
          timeoutUntil: m.timeoutUntil ? m.timeoutUntil.toISOString() : null,
          roles: sortedRoles,
          highestRolePosition,
          relationshipStatus,
        };
      })
      .sort((a, b) => {
        if (b.highestRolePosition !== a.highestRolePosition) {
          return b.highestRolePosition - a.highestRolePosition;
        }
        return a.effectiveName.localeCompare(b.effectiveName);
      });

    const response: GuildMembersResponse = {
      members,
      viewerPermissions: {
        isOwner: isViewerOwner,
        highestRolePosition: viewerHighestRolePosition,
        canManageNicknames: hasPermission(
          viewerPermsBitfield,
          Permissions.MANAGE_NICKNAMES,
        ),
        canManageRoles: hasPermission(
          viewerPermsBitfield,
          Permissions.MANAGE_ROLES,
        ),
        canKickMembers: hasPermission(
          viewerPermsBitfield,
          Permissions.KICK_MEMBERS,
        ),
        canBanMembers: hasPermission(
          viewerPermsBitfield,
          Permissions.BAN_MEMBERS,
        ),
      },
    };

    return NextResponse.json(response);
  } catch (error) {
    console.error("[GET_GUILD_MEMBERS_ERROR]", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}
