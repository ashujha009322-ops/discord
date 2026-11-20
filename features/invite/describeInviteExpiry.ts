/**
 * Pure helpers used by the invite UI. No React, no browser APIs, no Date.now():
 * the caller passes the current time in, which keeps these deterministic and testable.
 */

const UUID_REGEX =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/**
 * Normalises a route param into a channel id the server will accept.
 * `useParams()` can return a string, an array (catch-all segments) or nothing.
 * Anything that is not a UUID becomes null, so the server falls back to its default
 * channel instead of rejecting the whole request as invalid.
 */
export function normalizeChannelParam(
  value: string | string[] | undefined | null,
): string | null {
  const first = Array.isArray(value) ? value[0] : value;
  return first && UUID_REGEX.test(first) ? first : null;
}

const HOUR_MS = 60 * 60 * 1000;
const DAY_MS = 24 * HOUR_MS;

/** Human-readable expiry sentence. `now` is epoch milliseconds. */
export function describeInviteExpiry(
  expiresAt: string | null,
  now: number,
): string {
  if (expiresAt === null) return "Your invite link never expires.";

  const expiry = Date.parse(expiresAt);
  if (Number.isNaN(expiry)) return "";

  const remaining = expiry - now;
  if (remaining <= 0) return "Your invite link has expired.";

  if (remaining >= DAY_MS) {
    // ceil, so a brand-new 7-day invite does not read "6 days" after a few ms of latency
    const days = Math.ceil(remaining / DAY_MS);
    return `Your invite link expires in ${days} ${days === 1 ? "day" : "days"}.`;
  }
  if (remaining >= HOUR_MS) {
    const hours = Math.ceil(remaining / HOUR_MS);
    return `Your invite link expires in ${hours} ${hours === 1 ? "hour" : "hours"}.`;
  }
  return "Your invite link expires in less than an hour.";
}