import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { guildMemberParamsSchema } from "@/features/memberList/validators/member";
import { getAuthenticatedDbUser } from "@/lib/guild-auth";

export async function GET(
  _req: NextRequest,
  context: { params: Promise<{ guildId: string }> },
) {
  try {
    const actor = await getAuthenticatedDbUser();
    if (!actor) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const rawParams = await context.params;
    const parsed = guildMemberParamsSchema.safeParse(rawParams);
    if (!parsed.success) {
      return NextResponse.json({ error: "Invalid guild ID" }, { status: 400 });
    }
    const { guildId } = parsed.data;

    const membership = await prisma.guildMember.findUnique({
      where: { guildId_userId: { guildId, userId: actor.id } },
      select: { userId: true },
    });
    if (!membership) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const roles = await prisma.role.findMany({
      where: {
        guildId,
        isDefault: false,
        isManaged: false,
      },
      select: {
        id: true,
        name: true,
        color: true,
        position: true,
      },
      orderBy: { position: "desc" },
    });

    return NextResponse.json({ roles });
  } catch (error) {
    console.error("[GET_GUILD_ROLES_ERROR]", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}
