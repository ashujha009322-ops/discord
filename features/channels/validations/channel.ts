import { z } from "zod";
import { ChannelType } from "@/app/generated/prisma/enums";

export const ChannelTypeEnum = z.nativeEnum(ChannelType);
// Helper to safely handle optional/empty UUID fields like parentId
const optionalUuidSchema = z
  .union([
    z.string().uuid("Invalid Parent Category ID"),
    z.null(),
    z.undefined(),
    z.literal(""),
  ])
  .transform((val) => (val === "" || !val ? null : val));

export const createChannelSchema = z.object({
  guildId: z.string().uuid("Invalid Guild ID"),
  name: z
    .string()
    .min(1, "Channel name is required")
    .max(100, "Channel name cannot exceed 100 characters")
    .regex(
      /^[a-zA-Z0-9-_]+$/,
      "Channel names can only contain alphanumeric characters, hyphens, and underscores",
    ),
  type: ChannelTypeEnum,
  topic: z.string().max(1024, "Topic cannot exceed 1024 characters").optional(),
  parentId: optionalUuidSchema,
  isPrivate: z.boolean().default(false),
  slowmodeSeconds: z.number().min(0).max(21600).default(0),
});

export const createCategorySchema = z.object({
  guildId: z.string().uuid("Invalid Guild ID"),
  name: z
    .string()
    .min(1, "Category name is required")
    .max(100, "Category name cannot exceed 100 characters"),
  type: z.literal(ChannelType.TEXT).default(ChannelType.TEXT), // Default container type
  isPrivate: z.boolean().default(false),
});

export const updateChannelSchema = z.object({
  id: z.string().uuid("Invalid Channel ID"),
  guildId: z.string().uuid("Invalid Guild ID"),
  name: z
    .string()
    .min(1, "Name is required")
    .max(100, "Name cannot exceed 100 characters")
    .optional(),
  topic: z.string().max(1024).nullable().optional(),
  parentId: optionalUuidSchema,
  position: z.number().int().min(0).optional(),
  isPrivate: z.boolean().optional(),
  slowmodeSeconds: z.number().min(0).max(21600).optional(),
});

export const deleteChannelSchema = z.object({
  id: z.string().uuid("Invalid Channel ID"),
  guildId: z.string().uuid("Invalid Guild ID"),
});

export type CreateChannelInput = z.infer<typeof createChannelSchema>;
export type CreateCategoryInput = z.infer<typeof createCategorySchema>;
export type UpdateChannelInput = z.infer<typeof updateChannelSchema>;
export type DeleteChannelInput = z.infer<typeof deleteChannelSchema>;
