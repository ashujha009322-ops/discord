import { NextRequest, NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { prisma } from "@/lib/prisma";
import { guildMemberParamsSchema } from "@/features/memberList/validators/member";
import { resolveStorageUrl } from "@/features/memberList/storage";
import { MemberProfileDTO, RelationshipStatus} from "@/features/memberList/member";

export async function GET(
  _req: NextRequest,
  context: { params: Promise<{ guildId: string; userId: string }> },
) {
  try {
    const { userId: clerkId } = await auth();
    if (!clerkId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const rawParams = await context.params;
    const parsed = guildMemberParamsSchema.safeParse(rawParams);
    if (!parsed.success || !parsed.data.userId) {
      return NextResponse.json(
        { error: "Invalid parameters" },
        { status: 400 },
      );
    }
    const { guildId, userId: targetUserId } = parsed.data;

    const currentUser = await prisma.user.findUnique({
      where: { clerkId },
      select: { id: true },
    });
    if (!currentUser) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    // Ensure requester belongs to the guild
    const viewerMembership = await prisma.guildMember.findUnique({
      where: { guildId_userId: { guildId, userId: currentUser.id } },
      select: { userId: true },
    });
    if (!viewerMembership) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const [targetMember, relationship] = await Promise.all([
      prisma.guildMember.findUnique({
        where: { guildId_userId: { guildId, userId: targetUserId } },
        include: {
          guild: {
            select: { id: true, name: true, iconKey: true, ownerId: true },
          },
          user: {
            select: {
              id: true,
              username: true,
              displayName: true,
              avatarKey: true,
              bannerKey: true,
              bio: true,
              isBot: true,
              createdAt: true,
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
      }),
      currentUser.id === targetUserId
        ? null
        : prisma.relationship.findFirst({
            where: {
              OR: [
                { senderId: currentUser.id, receiverId: targetUserId },
                { senderId: targetUserId, receiverId: currentUser.id },
              ],
            },
          }),
    ]);

    if (!targetMember) {
      return NextResponse.json({ error: "Member not found" }, { status: 404 });
    }

    let relationshipStatus: RelationshipStatus = "NONE";
    if (currentUser.id === targetUserId) {
      relationshipStatus = "SELF";
    } else if (relationship) {
      if (relationship.type === "BLOCKED") relationshipStatus = "BLOCKED";
      else if (relationship.type === "FRIEND") relationshipStatus = "FRIEND";
      else if (relationship.type === "FRIEND_REQUEST") {
        relationshipStatus =
          relationship.senderId === currentUser.id
            ? "PENDING_SENT"
            : "PENDING_RECEIVED";
      }
    }

    const sortedRoles = targetMember.roles
      .map((mr) => mr.role)
      .filter((r) => !r.isDefault)
      .sort((a, b) => b.position - a.position)
      .map(({ id, name, color, position }) => ({
        id,
        name,
        color,
        position,
      }));

    const profile: MemberProfileDTO = {
      userId: targetMember.userId,
      guildId: targetMember.guildId,
      username: targetMember.user.username,
      displayName: targetMember.user.displayName,
      nickname: targetMember.nickname,
      effectiveName:
        targetMember.nickname ||
        targetMember.user.displayName ||
        targetMember.user.username,
      avatarUrl: resolveStorageUrl(targetMember.user.avatarKey),
      bannerUrl: resolveStorageUrl(targetMember.user.bannerKey),
      bio: targetMember.user.bio,
      isBot: targetMember.user.isBot,
      isOwner: targetMember.guild.ownerId === targetMember.userId,
      accountCreatedAt: targetMember.user.createdAt.toISOString(),
      joinedAt: targetMember.joinedAt.toISOString(),
      timeoutUntil: targetMember.timeoutUntil
        ? targetMember.timeoutUntil.toISOString()
        : null,
      roles: sortedRoles,
      highestRolePosition: sortedRoles[0]?.position ?? 0,
      relationshipStatus,
      guild: {
        id: targetMember.guild.id,
        name: targetMember.guild.name,
        iconUrl: resolveStorageUrl(targetMember.guild.iconKey),
      },
    };

    return NextResponse.json(profile);
  } catch (error) {
    console.error("[GET_MEMBER_PROFILE_ERROR]", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}
