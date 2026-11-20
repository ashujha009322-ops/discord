/**
 * Shared types for the invite feature.
 * Safe to import from both server actions and client components.
 */

/** Discriminated result returned by server actions. Actions never throw to the client. */
export type ActionResult<TData, TCode extends string = string> =
  | { ok: true; data: TData }
  | { ok: false; error: { code: TCode; message: string } };

export type InviteErrorCode =
  | "UNAUTHENTICATED" // no Clerk session
  | "USER_NOT_FOUND" // signed in with Clerk, but no matching row in our User table yet
  | "VALIDATION" // input failed the Zod schema
  | "FORBIDDEN" // not the guild owner, or the guild does not exist (deliberately indistinguishable)
  | "NO_LANDING_CHANNEL" // guild has no public channel a new member could land in
  | "RATE_LIMITED" // too many invites created recently
  | "INTERNAL"; // anything unexpected; details are logged server-side only

/** User-facing copy for every error code. */
export const INVITE_ERROR_MESSAGES: Record<InviteErrorCode, string> = {
  UNAUTHENTICATED: "You need to be signed in to create an invite.",
  USER_NOT_FOUND:
    "Your account is still being set up. Please try again in a moment.",
  VALIDATION:
    "That request was not valid. Please refresh the page and try again.",
  FORBIDDEN: "Only the server owner can create invite links.",
  NO_LANDING_CHANNEL:
    "This server has no public channel for new members to land in. Create one first.",
  RATE_LIMITED:
    "You are creating invites too quickly. Please wait a little and try again.",
  INTERNAL: "Something went wrong while creating the invite. Please try again.",
};

/** What the client receives. Only serializable primitives. */
export type InviteDTO = {
  code: string;
  /** Full shareable link, built on the server from NEXT_PUBLIC_APP_URL. */
  url: string;
  /** ISO-8601 timestamp, or null if the invite never expires. */
  expiresAt: string | null;
  /** Channel new members will land in. */
  channel: { id: string; name: string | null };
};

/**
 * Types and copy for the join flow. No imports, so safe on client and server.
 */

/** State of an invite as seen by a visitor. */
export type InviteStatus =
  | "valid"
  | "not_found"
  | "expired"
  | "revoked"
  | "max_uses";

/** Why a join attempt was refused. */
export type JoinFailureReason =
  | "NOT_FOUND"
  | "EXPIRED"
  | "REVOKED"
  | "MAX_USES"
  | "BANNED";

export type JoinErrorCode =
  | JoinFailureReason
  | "VALIDATION"
  | "UNAUTHENTICATED"
  | "USER_NOT_FOUND"
  | "INTERNAL";

export const JOIN_ERROR_MESSAGES: Record<JoinErrorCode, string> = {
  NOT_FOUND: "This invite link is invalid.",
  EXPIRED: "This invite link has expired.",
  REVOKED: "This invite link is no longer valid.",
  MAX_USES: "This invite link has reached its maximum number of uses.",
  BANNED: "You are not able to join this server.",
  VALIDATION: "This invite link is not valid.",
  UNAUTHENTICATED: "Please sign in to join this server.",
  USER_NOT_FOUND:
    "Your account is still being set up. Please try again in a moment.",
  INTERNAL: "Something went wrong while joining. Please try again.",
};

/** Page copy for invites that cannot be used. */
export const INVITE_STATUS_MESSAGES: Record<
  Exclude<InviteStatus, "valid">,
  { title: string; description: string }
> = {
  not_found: {
    title: "Invite not found",
    description:
      "This invite link is invalid. Ask the person who sent it for a new one.",
  },
  expired: {
    title: "Invite expired",
    description:
      "This invite link has expired. Ask the person who sent it for a new one.",
  },
  revoked: {
    title: "Invite no longer valid",
    description:
      "This invite link was cancelled. Ask the person who sent it for a new one.",
  },
  max_uses: {
    title: "Invite limit reached",
    description:
      "This invite link has been used the maximum number of times. Ask the person who sent it for a new one.",
  },
};
