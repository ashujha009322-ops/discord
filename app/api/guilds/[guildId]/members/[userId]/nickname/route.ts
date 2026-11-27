import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

import {
  guildMemberParamsSchema,
  updateNicknameSchema,
} from "@/features/memberList/validators/member";
import { Permissions } from "@/features/memberList/permissions";
import { authorizeGuildModeration } from "@/lib/guild-auth";

export async function PATCH(
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
      requiredPermission: Permissions.MANAGE_NICKNAMES,
      allowSelf: true,
    });
    if (!authz.ok) {
      return NextResponse.json(
        { error: authz.error },
        { status: authz.status },
      );
    }

    const body = await req.json();
    const parsedBody = updateNicknameSchema.safeParse(body);
    if (!parsedBody.success) {
      return NextResponse.json(
        { error: parsedBody.error.issues[0]?.message || "Invalid nickname" },
        { status: 400 },
      );
    }

    const updated = await prisma.guildMember.update({
      where: { guildId_userId: { guildId, userId } },
      data: { nickname: parsedBody.data.nickname },
      select: { userId: true, nickname: true },
    });

    return NextResponse.json(updated);
  } catch (error) {
    console.error("[UPDATE_NICKNAME_ERROR]", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}
