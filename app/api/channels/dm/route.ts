import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { getAuthenticatedDbUser } from "@/lib/guild-auth";

const createDmSchema = z.object({
  targetUserId: z.string().uuid("Invalid target user ID"),
});

export async function POST(req: NextRequest) {
  try {
    const actor = await getAuthenticatedDbUser();
    if (!actor) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await req.json();
    const parsed = createDmSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: "Invalid request body" },
        { status: 400 },
      );
    }

    const { targetUserId } = parsed.data;
    if (targetUserId === actor.id) {
      return NextResponse.json(
        { error: "Cannot open a DM with yourself" },
        { status: 400 },
      );
    }

    // Verify target user exists & check if blocked in either direction
    const [targetUser, blockRecord] = await Promise.all([
      prisma.user.findUnique({
        where: { id: targetUserId },
        select: { id: true },
      }),
      prisma.relationship.findFirst({
        where: {
          type: "BLOCKED",
          OR: [
            { senderId: actor.id, receiverId: targetUserId },
            { senderId: targetUserId, receiverId: actor.id },
          ],
        },
      }),
    ]);

    if (!targetUser) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }
    if (blockRecord) {
      return NextResponse.json(
        { error: "Cannot message a blocked user" },
        { status: 403 },
      );
    }

    // Reuse existing 1:1 DM channel if present
    const existingDm = await prisma.channel.findFirst({
      where: {
        type: "DM",
        AND: [
          { recipients: { some: { userId: actor.id } } },
          { recipients: { some: { userId: targetUserId } } },
        ],
      },
      select: { id: true },
    });

    if (existingDm) {
      return NextResponse.json({ channelId: existingDm.id });
    }

    // Create new DM channel + both recipients
    const newChannel = await prisma.channel.create({
      data: {
        type: "DM",
        isPrivate: true,
        recipients: {
          create: [{ userId: actor.id }, { userId: targetUserId }],
        },
      },
      select: { id: true },
    });

    return NextResponse.json({ channelId: newChannel.id }, { status: 201 });
  } catch (error) {
    console.error("[CREATE_DM_ERROR]", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}
