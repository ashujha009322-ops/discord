import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { getAuthenticatedDbUser } from "@/lib/guild-auth";

const paramsSchema = z.object({
  targetUserId: z.string().uuid(),
});

const relationshipActionSchema = z.object({
  action: z.enum([
    "ADD_FRIEND",
    "ACCEPT_FRIEND",
    "REMOVE_FRIEND",
    "BLOCK",
    "UNBLOCK",
  ]),
});

export async function POST(
  req: NextRequest,
  context: { params: Promise<{ targetUserId: string }> },
) {
  try {
    const actor = await getAuthenticatedDbUser();
    if (!actor) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const rawParams = await context.params;
    const parsedParams = paramsSchema.safeParse(rawParams);
    if (!parsedParams.success) {
      return NextResponse.json({ error: "Invalid user ID" }, { status: 400 });
    }
    const { targetUserId } = parsedParams.data;

    if (targetUserId === actor.id) {
      return NextResponse.json(
        { error: "Cannot update relationship with yourself" },
        { status: 400 },
      );
    }

    const body = await req.json();
    const parsedBody = relationshipActionSchema.safeParse(body);
    if (!parsedBody.success) {
      return NextResponse.json({ error: "Invalid action" }, { status: 400 });
    }

    const { action } = parsedBody.data;

    const existing = await prisma.relationship.findFirst({
      where: {
        OR: [
          { senderId: actor.id, receiverId: targetUserId },
          { senderId: targetUserId, receiverId: actor.id },
        ],
      },
    });

    if (action === "ADD_FRIEND") {
      if (existing?.type === "BLOCKED") {
        return NextResponse.json(
          { error: "Cannot send friend request while blocked" },
          { status: 403 },
        );
      }
      // If target already sent us a request, auto-accept
      if (
        existing?.type === "FRIEND_REQUEST" &&
        existing.senderId === targetUserId
      ) {
        await prisma.relationship.update({
          where: {
            senderId_receiverId: {
              senderId: targetUserId,
              receiverId: actor.id,
            },
          },
          data: { type: "FRIEND" },
        });
        return NextResponse.json({ status: "FRIEND" });
      }

      if (!existing) {
        await prisma.$transaction([
          prisma.relationship.create({
            data: {
              senderId: actor.id,
              receiverId: targetUserId,
              type: "FRIEND_REQUEST",
            },
          }),
          prisma.notification.create({
            data: {
              userId: targetUserId,
              type: "FRIEND_REQUEST",
              title: "New Friend Request",
              body: `${actor.displayName || actor.username} sent you a friend request.`,
              resourceId: actor.id,
            },
          }),
        ]);
      }

      return NextResponse.json({ status: "PENDING_SENT" });
    }

    if (action === "ACCEPT_FRIEND") {
      if (
        !existing ||
        existing.type !== "FRIEND_REQUEST" ||
        existing.senderId !== targetUserId
      ) {
        return NextResponse.json(
          { error: "No incoming friend request found" },
          { status: 404 },
        );
      }

      await prisma.relationship.update({
        where: {
          senderId_receiverId: {
            senderId: targetUserId,
            receiverId: actor.id,
          },
        },
        data: { type: "FRIEND" },
      });

      return NextResponse.json({ status: "FRIEND" });
    }

    if (action === "REMOVE_FRIEND") {
      await prisma.relationship.deleteMany({
        where: {
          type: { in: ["FRIEND", "FRIEND_REQUEST"] },
          OR: [
            { senderId: actor.id, receiverId: targetUserId },
            { senderId: targetUserId, receiverId: actor.id },
          ],
        },
      });
      return NextResponse.json({ status: "NONE" });
    }

    if (action === "BLOCK") {
      await prisma.$transaction([
        // Remove any prior non-block relationship in either direction
        prisma.relationship.deleteMany({
          where: {
            OR: [
              { senderId: actor.id, receiverId: targetUserId },
              {
                senderId: targetUserId,
                receiverId: actor.id,
                type: { not: "BLOCKED" },
              },
            ],
          },
        }),
        prisma.relationship.create({
          data: {
            senderId: actor.id,
            receiverId: targetUserId,
            type: "BLOCKED",
          },
        }),
      ]);
      return NextResponse.json({ status: "BLOCKED" });
    }

    if (action === "UNBLOCK") {
      await prisma.relationship.deleteMany({
        where: {
          senderId: actor.id,
          receiverId: targetUserId,
          type: "BLOCKED",
        },
      });
      return NextResponse.json({ status: "NONE" });
    }

    return NextResponse.json({ error: "Unhandled action" }, { status: 400 });
  } catch (error) {
    console.error("[RELATIONSHIP_ACTION_ERROR]", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}
