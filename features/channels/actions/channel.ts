/* eslint-disable @typescript-eslint/no-explicit-any */
"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import {
  createChannelSchema,
  createCategorySchema,
  updateChannelSchema,
  deleteChannelSchema,
  CreateChannelInput,
  CreateCategoryInput,
  UpdateChannelInput,
  DeleteChannelInput,
} from "../validations/channel";
import { requireAuth } from "@/lib/auth";

export async function createChannelAction(input: CreateChannelInput) {
  try {
    const validatedData = createChannelSchema.parse(input);
    const user = await requireAuth();
    const member = await prisma.guildMember.findUnique({
      where: {
        guildId_userId: {
          guildId: validatedData.guildId,
          userId: user.id,
        },
      },
    });

    if (!member) {
      return { success: false, error: "You are not a member of this server." };
    }
    // Calculate position relative to existing channels in the same category/level
    const maxPosition = await prisma.channel.aggregate({
      where: {
        guildId: validatedData.guildId,
        parentId: validatedData.parentId ?? null,
      },
      _max: { position: true },
    });

    const nextPosition = (maxPosition._max.position ?? -1) + 1;
    console.log("validatedData:", validatedData);
    const channel = await prisma.channel.create({
      data: {
        guildId: validatedData.guildId,
        name: validatedData.name.toLowerCase().trim(),
        type: validatedData.type,
        topic: validatedData.topic ?? null,
        parentId: validatedData.parentId ?? null,
        isPrivate: validatedData.isPrivate,
        slowmodeSeconds: validatedData.slowmodeSeconds,
        position: nextPosition,
      },
    });

    revalidatePath(`/guilds/${validatedData.guildId}`);
    return { success: true, data: channel };
  } catch (error: any) {
    return {
      success: false,
      error: error.message || "Failed to create channel",
    };
  }
}

export async function createCategoryAction(input: CreateCategoryInput) {
  try {
    const validatedData = createCategorySchema.parse(input);

    const maxPosition = await prisma.channel.aggregate({
      where: {
        guildId: validatedData.guildId,
        parentId: null,
      },
      _max: { position: true },
    });

    const nextPosition = (maxPosition._max.position ?? -1) + 1;

    const category = await prisma.channel.create({
      data: {
        guildId: validatedData.guildId,
        name: validatedData.name.toUpperCase().trim(),
        type: validatedData.type,
        parentId: null,
        isPrivate: validatedData.isPrivate,
        position: nextPosition,
      },
    });

    revalidatePath(`/guilds/${validatedData.guildId}`);
    return { success: true, data: category };
  } catch (error: any) {
    return {
      success: false,
      error: error.message || "Failed to create category",
    };
  }
}

export async function updateChannelAction(input: UpdateChannelInput) {
  try {
    const validatedData = updateChannelSchema.parse(input);

    const updatedChannel = await prisma.channel.update({
      where: { id: validatedData.id },
      data: {
        ...(validatedData.name && { name: validatedData.name.trim() }),
        ...(validatedData.topic !== undefined && {
          topic: validatedData.topic,
        }),
        ...(validatedData.parentId !== undefined && {
          parentId: validatedData.parentId,
        }),
        ...(validatedData.position !== undefined && {
          position: validatedData.position,
        }),
        ...(validatedData.isPrivate !== undefined && {
          isPrivate: validatedData.isPrivate,
        }),
        ...(validatedData.slowmodeSeconds !== undefined && {
          slowmodeSeconds: validatedData.slowmodeSeconds,
        }),
      },
    });

    revalidatePath(`/guilds/${validatedData.guildId}`);
    return { success: true, data: updatedChannel };
  } catch (error: any) {
    return {
      success: false,
      error: error.message || "Failed to update channel",
    };
  }
}

export async function deleteChannelAction(input: DeleteChannelInput) {
  try {
    const validatedData = deleteChannelSchema.parse(input);

    // Delete target channel (Prisma schema automatically handles setNull on child parentId)
    const deletedChannel = await prisma.channel.delete({
      where: { id: validatedData.id },
    });

    revalidatePath(`/guilds/${validatedData.guildId}`);
    return { success: true, data: deletedChannel };
  } catch (error: any) {
    return {
      success: false,
      error: error.message || "Failed to delete channel",
    };
  }
}

export async function getGuildChannelsAction(guildId: string) {
  try {
    const channels = await prisma.channel.findMany({
      where: { guildId },
      orderBy: [{ position: "asc" }, { createdAt: "asc" }],
      include: {
        children: {
          orderBy: [{ position: "asc" }, { createdAt: "asc" }],
        },
      },
    });

    return { success: true, data: channels };
  } catch (error: any) {
    return {
      success: false,
      error: error.message || "Failed to fetch channels",
    };
  }
}
