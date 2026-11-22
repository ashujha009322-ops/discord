import { NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { connection } from "next/server";

import { getCallingDirectoryByClerkId } from "@/lib/calling-users";

export async function GET() {
  await connection();

  try {
    const { userId: clerkId } = await auth();

    if (!clerkId) {
      return NextResponse.json(
        { error: "Authentication required to view online users." },
        { status: 401 },
      );
    }

    const payload = await getCallingDirectoryByClerkId(clerkId);

    return NextResponse.json(payload, {
      status: 200,
      headers: {
        "Cache-Control": "private, no-store",
      },
    });
  } catch (err: unknown) {
    if (err instanceof Error && err.message === "USER_NOT_FOUND") {
      return NextResponse.json(
        { error: "Your user profile was not found in the database." },
        { status: 404 },
      );
    }

    console.error("[GET /api/calling/users] Failed:", err);

    return NextResponse.json(
      { error: "Failed to load users. Please try again." },
      {
        status: 500,
        headers: {
          "Cache-Control": "private, no-store",
        },
      },
    );
  }
}
