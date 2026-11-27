import { z } from "zod";

export const guildMemberParamsSchema = z.object({
  guildId: z.string().uuid("Invalid guild ID"),
  userId: z.string().uuid("Invalid user ID").optional(),
});

export const updateNicknameSchema = z.object({
  nickname: z
    .string()
    .trim()
    .max(80, "Nickname must be 80 characters or fewer")
    .nullable(),
});

export const updateMemberRolesSchema = z.object({
  roleIds: z.array(z.string().uuid()),
});

export const moderationActionSchema = z.object({
  reason: z.string().trim().max(1000).optional(),
});
