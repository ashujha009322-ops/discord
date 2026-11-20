/* eslint-disable @typescript-eslint/no-explicit-any */
"use server";

import { auth } from "@clerk/nextjs/server";
import { prisma } from "@/lib/prisma";
import { supabaseAdmin } from "@/lib/supabase/client";

/**
 * Checks if username is available, ignoring current user's existing handle via clerkId.
 */
export async function checkUsernameAvailability(username: string) {
  const { userId: clerkId } = await auth();
  if (!clerkId) throw new Error("Unauthorized");

  const cleanUsername = username.startsWith("@") ? username : `@${username}`;

  const existing = await prisma.user.findFirst({
    where: {
      username: cleanUsername,
      NOT: { clerkId },
    },
    select: { id: true },
  });

  return { isAvailable: !existing };
}

/**
 * Uploads media and creates/updates the User record mapped by clerkId.
 */
export async function completeOnboarding(formData: FormData) {
  const { userId: clerkId } = await auth();
  if (!clerkId) return { success: false, error: "Unauthorized user session" };

  const displayName = formData.get("displayName") as string;
  const username = formData.get("username") as string;
  const bio = formData.get("bio") as string;
  const avatarFile = formData.get("avatar") as File | null;
  const bannerFile = formData.get("banner") as File | null;

  if (!displayName || !username) {
    return { success: false, error: "Display name and username are required" };
  }

  try {
    let avatarKey: string | null = null;
    let bannerKey: string | null = null;

    // 1. Upload Avatar using clerkId namespace
    if (avatarFile && avatarFile.size > 0) {
      const ext = avatarFile.name.split(".").pop() || "png";
      const path = `${clerkId}/avatar_${Date.now()}.${ext}`;
      const buffer = Buffer.from(await avatarFile.arrayBuffer());

      const { data, error } = await supabaseAdmin.storage
        .from("avatars")
        .upload(path, buffer, { contentType: avatarFile.type, upsert: true });

      if (error) throw new Error(`Avatar upload failed: ${error.message}`);
      avatarKey = data.path;
    }

    // 2. Upload Banner using clerkId namespace
    if (bannerFile && bannerFile.size > 0) {
      const ext = bannerFile.name.split(".").pop() || "png";
      const path = `${clerkId}/banner_${Date.now()}.${ext}`;
      const buffer = Buffer.from(await bannerFile.arrayBuffer());

      const { data, error } = await supabaseAdmin.storage
        .from("banners")
        .upload(path, buffer, { contentType: bannerFile.type, upsert: true });

      if (error) throw new Error(`Banner upload failed: ${error.message}`);
      bannerKey = data.path;
    }

    // 3. Upsert User using clerkId as lookup key
    const updatedUser = await prisma.user.upsert({
      where: { clerkId },
      update: {
        displayName,
        username,
        bio: bio || null,
        ...(avatarKey ? { avatarKey } : {}),
        ...(bannerKey ? { bannerKey } : {}),
      },
      create: {
        clerkId,
        displayName,
        username,
        bio: bio || null,
        avatarKey,
        bannerKey,
      },
    });

    return { success: true, user: updatedUser };
  } catch (err: any) {
    if (err.code === "P2002") {
      return { success: false, error: "Username is already taken" };
    }
    return {
      success: false,
      error: err.message || "Failed to complete profile onboarding",
    };
  }
}
