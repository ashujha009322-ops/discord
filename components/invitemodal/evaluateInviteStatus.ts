import type { InviteStatus, JoinFailureReason } from "../../features/invite/types";

export type InviteStatusInput = {
  targetType: "GUILD" | "GROUP_DM";
  guildId: string | null;
  revokedAt: Date | null;
  expiresAt: Date | null;
  maxUses: number | null;
  uses: number;
};

/**
 * Pure rule for "can this invite still be used?". `now` is injected for testing.
 *
 * Precedence when several apply: revoked, then expired, then used up.
 * An invite expires AT its expiresAt instant (the SQL in join.ts uses the same
 * strict comparison, so the two can never disagree about the boundary).
 * Only GUILD invites are joinable here; anything else reads as not found.
 */
export function evaluateInviteStatus(
  invite: InviteStatusInput | null,
  now: Date,
): InviteStatus {
  if (!invite || invite.targetType !== "GUILD" || invite.guildId === null) {
    return "not_found";
  }
  if (invite.revokedAt !== null) return "revoked";
  if (
    invite.expiresAt !== null &&
    invite.expiresAt.getTime() <= now.getTime()
  ) {
    return "expired";
  }
  if (invite.maxUses !== null && invite.uses >= invite.maxUses) {
    return "max_uses";
  }
  return "valid";
}

export function toFailureReason(
  status: Exclude<InviteStatus, "valid">,
): JoinFailureReason {
  switch (status) {
    case "not_found":
      return "NOT_FOUND";
    case "expired":
      return "EXPIRED";
    case "revoked":
      return "REVOKED";
    case "max_uses":
      return "MAX_USES";
  }
}
