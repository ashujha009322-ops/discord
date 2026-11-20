"use server";

import { auth } from "@clerk/nextjs/server";
import { prisma } from "@/lib/prisma";
import {
  createGuildSchema,
  CreateGuildInput,
  guildIdSchema,
  UpdateGuildInput,
  updateGuildSchema,
} from "../schemas/guild.schema";
import { revalidatePath } from "next/cache";

export async function createGuild(input: CreateGuildInput) {
  const { userId: clerkId } = await auth();
  if (!clerkId) {
    return { success: false, error: "Unauthorized" };
  }

  const parsed = createGuildSchema.safeParse(input);
  if (!parsed.success) {
    return { success: false, error: parsed.error.flatten().fieldErrors };
  }

  // Find the local user record linked to Clerk
  const user = await prisma.user.findUnique({
    where: { clerkId },
  });

  if (!user) {
    return { success: false, error: "User profile not found." };
  }

  try {
    const guild = await prisma.$transaction(async (tx) => {
      // 1. Create the guild
      const newGuild = await tx.guild.create({
        data: {
          name: parsed.data.name,
          description: parsed.data.description,
          iconKey: parsed.data.iconKey,
          bannerKey: parsed.data.bannerKey,
          ownerId: user.id,
        },
      });

      // 2. Create default @everyone role
      await tx.role.create({
        data: {
          guildId: newGuild.id,
          name: "@everyone",
          isDefault: true,
          permissions: 0,
        },
      });

      // 3. Add the owner as the first guild member
      await tx.guildMember.create({
        data: {
          guildId: newGuild.id,
          userId: user.id,
        },
      });

      return newGuild;
    });

    revalidatePath("/channels");
    return { success: true, data: guild };
  } catch (error) {
    console.error("Failed to create guild:", error);
    return { success: false, error: "Failed to create server." };
  }
}
export async function   getUserGuilds() {
  const { userId: clerkId } = await auth();
  if (!clerkId) {
    return { success: false, error: "Unauthorized" };
  }

  const user = await prisma.user.findUnique({
    where: { clerkId },
  });

  if (!user) {
    return { success: false, error: "User profile not found." };
  }

  try {
    const guilds = await prisma.guild.findMany({
      where: {
        members: {
          some: {
            userId: user.id,
          },
        },
      },
      include: {
        channels: {
          orderBy: { position: "asc" },
        },
      },
      orderBy: { createdAt: "asc" },
    });

    return { success: true, data: guilds };
  } catch (error) {
    console.error("Failed to fetch user guilds:", error);
    return { success: false, error: "Failed to fetch servers." };
  }
}

export async function getGuildById(guildId: string) {
  const { userId: clerkId } = await auth();
  if (!clerkId) {
    return { success: false, error: "Unauthorized" };
  }

  const parsed = guildIdSchema.safeParse({ guildId });
  if (!parsed.success) {
    return { success: false, error: "Invalid guild ID" };
  }

  const user = await prisma.user.findUnique({
    where: { clerkId },
  });

  if (!user) {
    return { success: false, error: "User profile not found." };
  }

  try {
    // Check if user is a member of the guild
    const membership = await prisma.guildMember.findUnique({
      where: {
        guildId_userId: {
          guildId,
          userId: user.id,
        },
      },
    });

    if (!membership) {
      return { success: false, error: "Access denied or not a member." };
    }

    const guild = await prisma.guild.findUnique({
      where: { id: guildId },
      include: {
        channels: {
          orderBy: { position: "asc" },
        },
        roles: {
          orderBy: { position: "desc" },
        },
        members: {
          include: {
            user: true,
            roles: true,
          },
        },
      },
    });

    if (!guild) {
      return { success: false, error: "Server not found." };
    }

    return { success: true, data: guild };
  } catch (error) {
    console.error("Failed to fetch guild details:", error);
    return { success: false, error: "Failed to fetch server details." };
  }
}

export async function updateGuild(input: UpdateGuildInput) {
  const { userId: clerkId } = await auth();
  if (!clerkId) {
    return { success: false, error: "Unauthorized" };
  }

  const parsed = updateGuildSchema.safeParse(input);
  if (!parsed.success) {
    return { success: false, error: parsed.error.flatten().fieldErrors };
  }

  const { guildId, ...updateData } = parsed.data;

  const user = await prisma.user.findUnique({
    where: { clerkId },
  });

  if (!user) {
    return { success: false, error: "User profile not found." };
  }

  try {
    const guild = await prisma.guild.findUnique({
      where: { id: guildId },
    });

    if (!guild) {
      return { success: false, error: "Server not found." };
    }

    // Restrict updates to the guild owner
    if (guild.ownerId !== user.id) {
      return {
        success: false,
        error: "Only the server owner can update server settings.",
      };
    }

    const updatedGuild = await prisma.guild.update({
      where: { id: guildId },
      data: {
        ...(updateData.name !== undefined && { name: updateData.name }),
        ...(updateData.description !== undefined && {
          description: updateData.description,
        }),
        ...(updateData.iconKey !== undefined && {
          iconKey: updateData.iconKey,
        }),
        ...(updateData.bannerKey !== undefined && {
          bannerKey: updateData.bannerKey,
        }),
      },
    });

    revalidatePath("/channels");
    return { success: true, data: updatedGuild };
  } catch (error) {
    console.error("Failed to update guild:", error);
    return { success: false, error: "Failed to update server." };
  }
}

export async function deleteGuild(input: { guildId: string }) {
  const { userId: clerkId } = await auth();
  if (!clerkId) {
    return { success: false, error: "Unauthorized" };
  }

  const parsed = guildIdSchema.safeParse(input);
  if (!parsed.success) {
    return { success: false, error: "Invalid guild ID" };
  }

  const { guildId } = parsed.data;

  const user = await prisma.user.findUnique({
    where: { clerkId },
  });

  if (!user) {
    return { success: false, error: "User profile not found." };
  }

  try {
    const guild = await prisma.guild.findUnique({
      where: { id: guildId },
    });

    if (!guild) {
      return { success: false, error: "Server not found." };
    }

    // Only the server owner can delete the guild
    if (guild.ownerId !== user.id) {
      return {
        success: false,
        error: "Only the server owner can delete this server.",
      };
    }

    await prisma.guild.delete({
      where: { id: guildId },
    });

    revalidatePath("/channels");
    return { success: true, data: { guildId } };
  } catch (error) {
    console.error("Failed to delete guild:", error);
    return { success: false, error: "Failed to delete server." };
  }
}
