/**
 * Where a member lands after joining.
 *
 * CONFIRM: this must match your real route structure. It is the only place in the
 * join flow that knows your URLs, so a mismatch is a one-line fix here.
 */
export function guildChannelPath(
  guildId: string,
  channelId: string | null,
): string {
  return channelId
    ? `/servers/${guildId}/channels/${channelId}`
    : `/servers/${guildId}`;
}
