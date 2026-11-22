import { NextRequest, NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { prisma } from "@/lib/prisma";

interface SubscriptionBody {
  endpoint?: string;
  keys?: {
    p256dh?: string;
    auth?: string;
  };
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

    const body = (await req
      .json()
      .catch(() => null)) as SubscriptionBody | null;
    const endpoint = body?.endpoint?.trim();
    const p256dh = body?.keys?.p256dh?.trim();
    const authKey = body?.keys?.auth?.trim();

    if (!endpoint || !p256dh || !authKey) {
      return NextResponse.json(
        { error: "Invalid push subscription payload." },
        { status: 400 },
      );
    }

    const dbUser = await prisma.user.findUnique({
      where: { clerkId },
      select: { id: true },
    });

    if (!dbUser) {
      return NextResponse.json(
        { error: "User profile not found." },
        { status: 404 },
      );
    }

    const userAgent = req.headers.get("user-agent")?.slice(0, 500) ?? null;

    await prisma.pushSubscription.upsert({
      where: { endpoint },
      update: {
        userId: dbUser.id,
        p256dh,
        auth: authKey,
        userAgent,
      },
      create: {
        userId: dbUser.id,
        endpoint,
        p256dh,
        auth: authKey,
        userAgent,
      },
    });

    return NextResponse.json({ ok: true }, { status: 200 });
  } catch (err) {
    console.error("[POST /api/push/subscription]", err);
    return NextResponse.json(
      { error: "Failed to save push subscription." },
      { status: 500 },
    );
  }
}

export async function DELETE(req: NextRequest) {
  try {
    const { userId: clerkId } = await auth();
    if (!clerkId) {
      return NextResponse.json(
        { error: "Authentication required." },
        { status: 401 },
      );
    }

    const body = (await req.json().catch(() => null)) as {
      endpoint?: string;
    } | null;
    const endpoint = body?.endpoint?.trim();

    if (!endpoint) {
      return NextResponse.json(
        { error: "Endpoint is required to remove subscription." },
        { status: 400 },
      );
    }

    const dbUser = await prisma.user.findUnique({
      where: { clerkId },
      select: { id: true },
    });

    if (!dbUser) {
      return NextResponse.json(
        { error: "User profile not found." },
        { status: 404 },
      );
    }

    await prisma.pushSubscription.deleteMany({
      where: {
        endpoint,
        userId: dbUser.id,
      },
    });

    return NextResponse.json({ ok: true }, { status: 200 });
  } catch (err) {
    console.error("[DELETE /api/push/subscription]", err);
    return NextResponse.json(
      { error: "Failed to remove push subscription." },
      { status: 500 },
    );
  }
}
