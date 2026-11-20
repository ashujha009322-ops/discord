"use server";

import { auth } from "@clerk/nextjs/server";

import { INVITE_DEFAULT_EXPIRY_MS } from "../constants";
import {
  countInvitesCreatedSince,
  createInviteRecord,
  findReusableInvite,
  findUserIdByClerkId,
  isGuildOwner,
  resolveLandingChannel,
  type InviteRecord,
} from "../query";
import { getOrCreateInviteInputSchema } from "./schemas";
import {
  INVITE_ERROR_MESSAGES,
  type ActionResult,
  type InviteDTO,
  type InviteErrorCode,
} from "../types";
import { buildInviteUrl } from "../url";

// Safety net, not a feature limit. Thanks to invite reuse, normal use creates at most one
// row per channel per week, so legitimate users never get near this.
const CREATE_LIMIT = 30;
const CREATE_WINDOW_MS = 60 * 60 * 1000;

function fail(code: InviteErrorCode): ActionResult<never, InviteErrorCode> {
  return { ok: false, error: { code, message: INVITE_ERROR_MESSAGES[code] } };
}

function toInviteDTO(
  invite: InviteRecord,
  channel: { id: string; name: string | null },
): InviteDTO {
  return {
    code: invite.code,
    url: buildInviteUrl(invite.code),
    expiresAt: invite.expiresAt ? invite.expiresAt.toISOString() : null,
    channel: { id: channel.id, name: channel.name },
  };
}

/**
 * Returns a shareable invite link for a guild, reusing the owner's existing valid
 * invite when there is one and creating a new one otherwise.
 *
 * Order matters: validate input, authenticate, authorize, and only then touch data.
 * Server actions are public POST endpoints, so nothing from the client is trusted.
 */
export async function getOrCreateInvite(
  rawInput: unknown,
): Promise<ActionResult<InviteDTO, InviteErrorCode>> {
  try {
    const parsed = getOrCreateInviteInputSchema.safeParse(rawInput);
    if (!parsed.success) return fail("VALIDATION");
    const { guildId, channelId: preferredChannelId } = parsed.data;

    const { userId: clerkId } = await auth();
    if (!clerkId) return fail("UNAUTHENTICATED");

    const userId = await findUserIdByClerkId(clerkId);
    if (!userId) return fail("USER_NOT_FOUND");

    // Owner-only policy. A missing guild and a non-owner get the same answer on purpose.
    if (!(await isGuildOwner(guildId, userId))) return fail("FORBIDDEN");

    const channel = await resolveLandingChannel(guildId, preferredChannelId);
    if (!channel) return fail("NO_LANDING_CHANNEL");

    let invite = await findReusableInvite({
      guildId,
      channelId: channel.id,
      createdById: userId,
    });

    if (!invite) {
      const since = new Date(Date.now() - CREATE_WINDOW_MS);
      if ((await countInvitesCreatedSince(userId, since)) >= CREATE_LIMIT) {
        return fail("RATE_LIMITED");
      }

      invite = await createInviteRecord({
        guildId,
        channelId: channel.id,
        createdById: userId,
        expiresAt: new Date(Date.now() + INVITE_DEFAULT_EXPIRY_MS),
        maxUses: null,
      });
    }

    return { ok: true, data: toInviteDTO(invite, channel) };
  } catch (error) {
    // Details stay on the server; the client only sees a generic message.
    console.error("[invites] getOrCreateInvite failed", error);
    return fail("INTERNAL");
  }
}
