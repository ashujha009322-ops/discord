/**
 * Pure permission rules - no database, no I/O.
 *
 * Today the only privileged actor is the guild owner. Every rule goes through
 * `canModerateMessages`, so adding Role.permissions / channel overwrites later
 * means changing this file, not every action.
 */

export type MessageActor = {
  userId: string;
  isGuildOwner: boolean;
};

/** Delete or edit other people's messages. */
export function canModerateMessages(actor: MessageActor): boolean {
  return actor.isGuildOwner;
}

/** Authors may edit their own messages; the guild owner may edit anyone's. */
export function canEditMessage(
  actor: MessageActor,
  message: { authorId: string | null },
): boolean {
  return message.authorId === actor.userId || canModerateMessages(actor);
}

/**
 * Authors may delete their own messages; the guild owner may delete anyone's.
 * A message whose author account was deleted (authorId = null) can only be
 * removed by the owner.
 */
export function canDeleteMessage(
  actor: MessageActor,
  message: { authorId: string | null },
): boolean {
  return message.authorId === actor.userId || canModerateMessages(actor);
}

/** Kick / ban: owner only, and the owner can never target themselves. */
export function canKickOrBanMember(
  actor: MessageActor,
  targetUserId: string,
): boolean {
  return canModerateMessages(actor) && targetUserId !== actor.userId;
}
