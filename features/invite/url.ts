import { INVITE_PATH_PREFIX } from "./constants";

/**
 * Builds the shareable link for an invite code.
 *
 * Reads NEXT_PUBLIC_APP_URL (for example "https://app.example.com").
 * `new URL` validates the value and normalises trailing slashes.
 * Throws if the variable is missing or not an absolute URL, so a misconfigured
 * deployment fails loudly instead of handing out broken links.
 */
export function buildInviteUrl(code: string): string {
  const base = process.env.NEXT_PUBLIC_APP_URL?.trim();
  if (!base) {
    throw new Error(
      "NEXT_PUBLIC_APP_URL is not set; cannot build invite links.",
    );
  }
  return new URL(`${INVITE_PATH_PREFIX}/${code}`, base).toString();
}
