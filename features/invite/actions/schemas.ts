import { z } from "zod";

/**
 * Input for `getOrCreateInvite`.
 *
 * Everything here comes from the client and is therefore untrusted:
 * the action re-checks ownership and channel membership on the server.
 */
export const getOrCreateInviteInputSchema = z.object({
  guildId: z.string().uuid(),
  /**
   * Channel the user is currently viewing. Optional: when it is missing or not
   * eligible, the server falls back to the first public text channel.
   */
  channelId: z.string().uuid().nullish(),
});

export type GetOrCreateInviteInput = z.infer<
  typeof getOrCreateInviteInputSchema
>;
