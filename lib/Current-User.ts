import "server-only";

import { cache } from "react";
import { auth } from "@clerk/nextjs/server";
import { prisma } from "@/lib/prisma";

const currentUserSelect = {
  id: true,
  clerkId: true,
  username: true,
  displayName: true,
  avatarKey: true,
} as const;

export type CurrentUser = {
  id: string;
  clerkId: string;
  username: string;
  displayName: string | null;
  avatarKey: string | null;
};

export type CurrentUserResult =
  | { ok: true; user: CurrentUser }
  | { ok: false; reason: "UNAUTHENTICATED" | "USER_NOT_FOUND" };

/**
 * Resolves the signed-in Clerk session to the local `User` row.
 *
 * It never throws for "not signed in" or "no local profile" - the caller
 * decides how to react (the messages feature turns these into ActionErrors).
 *
 * Wrapped in React `cache` so repeated calls within one request hit the DB once.
 */
export const getCurrentUser = cache(async (): Promise<CurrentUserResult> => {
  const { userId: clerkId } = await auth();
  if (!clerkId) return { ok: false, reason: "UNAUTHENTICATED" };

  const user = await prisma.user.findUnique({
    where: { clerkId },
    select: currentUserSelect,
  });
  if (!user) return { ok: false, reason: "USER_NOT_FOUND" };

  return { ok: true, user };
});
