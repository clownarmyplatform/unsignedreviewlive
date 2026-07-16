import type { SupabaseClient } from "@supabase/supabase-js";
import {
  createNoticeboardImagePath,
  NOTICEBOARD_IMAGE_BUCKET,
} from "@/lib/noticeboard";
import type { Database } from "@/lib/supabase/types";

export async function saveAdminNoticeboardPost(
  adminClient: SupabaseClient<Database>,
  input: {
    body: string;
    imageBuffer: Buffer | null;
    imageContentType: string | null;
    imageFileName: string | null;
    postId: string | null;
    removeExistingImage: boolean;
    tag: string | null;
    title: string;
  },
) {
  let existingImagePath: { image_path: string | null; image_url: string | null } | null = null;

  if (input.postId) {
    const { data, error } = await adminClient
      .from("noticeboard_posts")
      .select("image_path, image_url")
      .eq("id", input.postId)
      .maybeSingle();

    if (error) {
      throw new Error(error.message);
    }

    existingImagePath = data ?? null;
  }

  let nextImagePath = input.removeExistingImage
    ? null
    : existingImagePath?.image_path ?? null;
  let nextImageUrl = input.removeExistingImage
    ? null
    : existingImagePath?.image_url ?? null;
  let uploadedImagePath: string | null = null;

  try {
    if (input.imageBuffer && input.imageContentType) {
      nextImagePath = createNoticeboardImagePath(input.imageFileName ?? "image");
      uploadedImagePath = nextImagePath;

      const { error: uploadError } = await adminClient.storage
        .from(NOTICEBOARD_IMAGE_BUCKET)
        .upload(nextImagePath, input.imageBuffer, {
          cacheControl: "3600",
          contentType: input.imageContentType,
          upsert: false,
        });

      if (uploadError) {
        throw new Error(uploadError.message);
      }

      const { data } = adminClient.storage
        .from(NOTICEBOARD_IMAGE_BUCKET)
        .getPublicUrl(nextImagePath);

      nextImageUrl = data.publicUrl;
    }

    const payload = {
      p_body: input.body,
      p_image_path: nextImagePath,
      p_image_url: nextImageUrl,
      p_tag: input.tag,
      p_title: input.title,
    };

    if (input.postId) {
      const { data, error } = await adminClient.rpc("update_noticeboard_post", {
        p_post_id: input.postId,
        ...payload,
      });

      if (error) {
        throw new Error(error.message);
      }

      if (
        (input.removeExistingImage || input.imageBuffer) &&
        existingImagePath?.image_path &&
        existingImagePath.image_path !== nextImagePath
      ) {
        await adminClient.storage
          .from(NOTICEBOARD_IMAGE_BUCKET)
          .remove([existingImagePath.image_path]);
      }

      return {
        created: false,
        post: data,
      };
    }

    const { data, error } = await adminClient.rpc("create_noticeboard_post", payload);

    if (error) {
      throw new Error(error.message);
    }

    return {
      created: true,
      post: data,
    };
  } catch (error) {
    if (uploadedImagePath) {
      await adminClient.storage.from(NOTICEBOARD_IMAGE_BUCKET).remove([uploadedImagePath]);
    }

    throw error;
  }
}

export async function deleteAdminNoticeboardPost(
  adminClient: SupabaseClient<Database>,
  postId: string,
) {
  const { data, error } = await adminClient.rpc("delete_noticeboard_post", {
    p_post_id: postId,
  });

  if (error) {
    throw new Error(error.message);
  }

  if (data?.image_path) {
    await adminClient.storage.from(NOTICEBOARD_IMAGE_BUCKET).remove([data.image_path]);
  }
}
