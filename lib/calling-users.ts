import { prisma } from "@/lib/prisma"; // adjust to your singleton Prisma client path

export interface DirectoryUser {
  id: string;
  username: string;
  displayName: string | null;
  avatarKey: string | null;
}

export interface CallingDirectoryPayload {
  currentUser: DirectoryUser;
  users: DirectoryUser[];
}

export async function getCallingDirectoryByClerkId(
  clerkId: string,
): Promise<CallingDirectoryPayload> {
  if (!clerkId || typeof clerkId !== "string") {
    throw new Error("UNAUTHORIZED_CLERK_ID");
  }

  const currentUser = await prisma.user.findUnique({
    where: { clerkId },
    select: {
      id: true,
      username: true,
      displayName: true,
      avatarKey: true,
    },
  });

  if (!currentUser) {
    throw new Error("USER_NOT_FOUND");
  }

  const users = await prisma.user.findMany({
    where: {
      id: { not: currentUser.id },
      isBot: false,
    },
    select: {
      id: true,
      username: true,
      displayName: true,
      avatarKey: true,
    },
    orderBy: [{ displayName: "asc" }, { username: "asc" }],
    take: 200,
  });

  return { currentUser, users };
}
