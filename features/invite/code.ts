import { randomInt } from "node:crypto";

import { INVITE_CODE_ALPHABET, INVITE_CODE_LENGTH } from "./constants";

/**
 * Generates a random invite code.
 *
 * `crypto.randomInt` is backed by the CSPRNG and draws uniformly from the range
 * (it rejects out-of-range samples internally), so there is no modulo bias.
 *
 * Server-only: importing `node:crypto` into a client component fails the build,
 * which is the guard we want.
 */
export function generateInviteCode(): string {
  let code = "";
  for (let i = 0; i < INVITE_CODE_LENGTH; i++) {
    code += INVITE_CODE_ALPHABET.charAt(randomInt(INVITE_CODE_ALPHABET.length));
  }
  return code;
}
