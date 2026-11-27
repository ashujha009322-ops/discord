import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import {
  guildMemberParamsSchema,
  moderationActionSchema,
} from "@/features/memberList/validators/member";
import { Permissions } from "@/features/memberList/permissions";
import { authorizeGuildModeration } from "@/lib/guild-auth";

export async function POST(
  req: NextRequest,
  context: { params: Promise<{ guildId: string; userId: string }> },
) {
  try {
    const rawParams = await context.params;
    const parsedParams = guildMemberParamsSchema.safeParse(rawParams);
    if (!parsedParams.success || !parsedParams.data.userId) {
      return NextResponse.json(
        { error: "Invalid parameters" },
        { status: 400 },
      );
    }
    const { guildId, userId } = parsedParams.data;

    const authz = await authorizeGuildModeration({
      guildId,
      targetUserId: userId,
      requiredPermission: Permissions.KICK_MEMBERS,
    });
    if (!authz.ok) {
      return NextResponse.json(
        { error: authz.error },
        { status: authz.status },
      );
    }

    const body = await req.json().catch(() => ({}));
    const parsedBody = moderationActionSchema.safeParse(body);
    const reason = parsedBody.success ? parsedBody.data.reason : undefined;

    await prisma.$transaction([
      prisma.guildMember.delete({
        where: { guildId_userId: { guildId, userId } },
      }),
      prisma.auditLog.create({
        data: {
          guildId,
          actorId: authz.actor.id,
          action: "MEMBER_KICK",
          targetId: userId,
          metadata: reason ? { reason } : undefined,
        },
      }),
    ]);

    return NextResponse.json({ kicked: true });
  } catch (error) {
    console.error("[KICK_MEMBER_ERROR]", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}
