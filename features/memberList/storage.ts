const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const STORAGE_BUCKET = process.env.NEXT_PUBLIC_SUPABASE_BUCKET || "avatars";

export function resolveStorageUrl(
  key: string | null | undefined,
): string | null {
  if (!key) return null;
  if (key.startsWith("http://") || key.startsWith("https://")) {
    return key;
  }
  if (!SUPABASE_URL) return null;
  return `${SUPABASE_URL}/storage/v1/object/public/${STORAGE_BUCKET}/${key}`;
}

export function intColorToHex(color: number | null | undefined): string {
  if (color === null || color === undefined || color === 0) {
    return "#99aab5"; // Default Discord neutral role color
  }
  return `#${color.toString(16).padStart(6, "0")}`;
}
