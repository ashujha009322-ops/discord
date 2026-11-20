import { supabaseAdmin } from "./client";

export type StorageBucket = "avatars" | "banners";

/**
 * Uploads a file to a specified Supabase storage bucket and returns its storage key.
 */
export async function uploadUserImage(
  file: File,
  bucket: StorageBucket,
  userId: string,
): Promise<string> {
  const fileExt = file.name.split(".").pop() || "png";
  const fileName = `${userId}/${Date.now()}.${fileExt}`;

  const { data, error } = await supabaseAdmin.storage
    .from(bucket)
    .upload(fileName, file, {
      cacheControl: "3600",
      upsert: true,
    });

  if (error) {
    throw new Error(`Failed to upload image to ${bucket}: ${error.message}`);
  }

  // Returns storage key path (e.g., "usr_123/1710000000000.png")
  return data.path;
}
