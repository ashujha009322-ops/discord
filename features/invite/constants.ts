/**
 * Invite feature constants.
 * Pure values with no imports, so they are safe to use on both client and server.
 */

export const INVITE_CODE_LENGTH = 10;

/**
 * Base62, case-sensitive.
 * 62^10 is roughly 8.4e17 combinations (about 59.5 bits of entropy).
 */
export const INVITE_CODE_ALPHABET =
  "0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz";

/** Shape check for any code arriving from a URL or a request body. */
export const INVITE_CODE_REGEX = new RegExp(
  `^[0-9A-Za-z]{${INVITE_CODE_LENGTH}}$`,
);

const DAY_MS = 24 * 60 * 60 * 1000;

/** Default lifetime of a newly created invite. */
export const INVITE_DEFAULT_EXPIRY_MS = 7 * DAY_MS;

/**
 * An existing invite is only reused if it still has at least this much life left,
 * so nobody copies a link that is about to expire.
 */
export const INVITE_REUSE_MIN_REMAINING_MS = 1 * DAY_MS;

/** How many times we retry when a freshly generated code collides with an existing one. */
export const INVITE_CODE_MAX_ATTEMPTS = 5;

/** Public route that handles invite links: `${APP_URL}/invite/<code>`. */
export const INVITE_PATH_PREFIX = "/invite";
