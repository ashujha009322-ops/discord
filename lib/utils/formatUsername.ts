/**
 * Transforms display name into a sanitized username slug (max 32 chars).
 * Removes special characters and formats spaces with underscores.
 */
export function generateUsername(displayName: string): string {
  const sanitized = displayName
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9_\s]/g, "")
    .replace(/\s+/g, "_")
    .slice(0, 32);

  return sanitized ? `@${sanitized}` : "";
}
