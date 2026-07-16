import type { SupabaseClient } from "@supabase/supabase-js";
import { AVATAR_BUCKET, getAvatarPath } from "@/lib/avatar";
import type { Database } from "@/lib/supabase/types";

export async function saveAvatar(
  adminClient: SupabaseClient<Database>,
  input: {
    contentType: string;
    fileBuffer: Buffer;
    userId: string;
  },
) {
  const avatarPath = getAvatarPath(input.userId);
  const { error: uploadError } = await adminClient.storage
    .from(AVATAR_BUCKET)
    .upload(avatarPath, input.fileBuffer, {
      cacheControl: "3600",
      contentType: input.contentType,
      upsert: true,
    });

  if (uploadError) {
    throw new Error(uploadError.message);
  }

  const { data } = adminClient.storage.from(AVATAR_BUCKET).getPublicUrl(avatarPath);
  const avatarUrl = `${data.publicUrl}?v=${Date.now()}`;
  const { error: updateError } = await adminClient
    .from("user_profiles")
    .update({
      avatar_path: avatarPath,
      avatar_url: avatarUrl,
      updated_at: new Date().toISOString(),
    })
    .eq("auth_user_id", input.userId);

  if (updateError) {
    throw new Error(updateError.message);
  }

  return {
    avatarUrl,
  };
}
