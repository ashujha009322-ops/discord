import { z } from "zod";

export const createGuildSchema = z.object({
  name: z
    .string()
    .min(1, "Server name is required")
    .max(100, "Server name must be 100 characters or less"),
  description: z
    .string()
    .max(500, "Description must be 500 characters or less")
    .optional(),
  iconKey: z.string().optional(),
  bannerKey: z.string().optional(),
});

export const updateGuildSchema = z.object({
  guildId: z.string().uuid("Invalid guild ID"),
  name: z.string().min(1).max(100).optional(),
  description: z.string().max(500).optional().nullable(),
  iconKey: z.string().optional().nullable(),
  bannerKey: z.string().optional().nullable(),
});

export const guildIdSchema = z.object({
  guildId: z.string().uuid("Invalid guild ID"),
});

export type CreateGuildInput = z.infer<typeof createGuildSchema>;
export type UpdateGuildInput = z.infer<typeof updateGuildSchema>;
