"use server";

import { auth } from "@clerk/nextjs/server";
import { redirect } from "next/navigation";

import { joinGuildWithInvite } from "@/features/invite/actions/join.action";
import { acceptInviteInputSchema } from "./acceptInviteInputSchema";
import {
  JOIN_ERROR_MESSAGES,
  type JoinErrorCode,
} from "../../features/invite/types";
import { findUserIdByClerkId } from "../../features/invite/query";
import { guildChannelPath } from "../../features/invite/actions/guildChannelPath";
import type { ActionResult } from "../../features/invite/types";

function fail(code: JoinErrorCode): ActionResult<never, JoinErrorCode> {
  return { ok: false, error: { code, message: JOIN_ERROR_MESSAGES[code] } };
}

/**
 * Joins the signed-in user to the guild behind an invite code.
 * On success this redirects and never returns; on failure it returns a typed error.
 *
 * `redirect()` works by throwing, so it must stay OUTSIDE the try/catch, or the
 * catch block would swallow it and report a bogus INTERNAL error.
 */
export async function acceptInvite(
  rawInput: unknown,
): Promise<ActionResult<never, JoinErrorCode>> {
  let destination: string;

  try {
    const parsed = acceptInviteInputSchema.safeParse(rawInput);
    if (!parsed.success) return fail("VALIDATION");

    const { userId: clerkId } = await auth();
    if (!clerkId) return fail("UNAUTHENTICATED");

    const userId = await findUserIdByClerkId(clerkId);
    if (!userId) return fail("USER_NOT_FOUND");

    const result = await joinGuildWithInvite({
      code: parsed.data.code,
      userId,
    });
    if (result.status === "rejected") return fail(result.reason);

    destination = guildChannelPath(result.guildId, result.channelId);
  } catch (error) {
    console.error("[invites] acceptInvite failed", error);
    return fail("INTERNAL");
  }

  redirect(`/dashboard`);
}
