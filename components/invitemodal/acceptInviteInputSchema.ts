import { z } from "zod";

import { INVITE_CODE_REGEX } from "../../features/invite/constants";

/** Input for `acceptInvite`. The code comes from a URL, so it is untrusted. */
export const acceptInviteInputSchema = z.object({
  code: z.string().regex(INVITE_CODE_REGEX),
});

export type AcceptInviteInput = z.infer<typeof acceptInviteInputSchema>;
