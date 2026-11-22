import { NextRequest, NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { prisma } from "@/lib/prisma";
import { sendIncomingCallPushToUser } from "@/lib/web-push-server";

interface CallAlertBody {
  targetUserId?: string;
  callId?: string;
  mode?: "audio" | "video";
}

export async function POST(req: NextRequest) {
  try {
    const { userId: clerkId } = await auth();
    if (!clerkId) {
      return NextResponse.json(
        { error: "Authentication required." },
        { status: 401 },
      );
    }

    const body = (await req.json().catch(() => null)) as CallAlertBody | null;
    const targetUserId = body?.targetUserId?.trim();
    const callId = body?.callId?.trim();
    const mode = body?.mode === "video" ? "video" : "audio";

    if (!targetUserId || !callId) {
      return NextResponse.json(
        { error: "targetUserId and callId are required." },
        { status: 400 },
      );
    }

    const caller = await prisma.user.findUnique({
      where: { clerkId },
      select: {
        id: true,
        username: true,
        displayName: true,
      },
    });

    if (!caller) {
      return NextResponse.json(
        { error: "Caller profile not found." },
        { status: 404 },
      );
    }

    const target = await prisma.user.findUnique({
      where: { id: targetUserId },
      select: { id: true },
    });

    if (!target) {
      return NextResponse.json(
        { error: "Target user not found." },
        { status: 404 },
      );
    }

    const callerLabel = caller.displayName || caller.username;
    const callKindLabel = mode === "video" ? "Video" : "Voice";

    const result = await sendIncomingCallPushToUser(target.id, {
      title: `Incoming ${callKindLabel} Call`,
      body: `${callerLabel} is calling you.`,
      url: "/calling",
      callId,
      fromUserId: caller.id,
      fromUsername: caller.username,
      fromDisplayName: caller.displayName,
      mode,
    });

    return NextResponse.json({ ok: true, ...result }, { status: 200 });
  } catch (err) {
    console.error("[POST /api/push/call-alert]", err);
    return NextResponse.json(
      { error: "Failed to dispatch call push notification." },
      { status: 500 },
    );
  }
}
