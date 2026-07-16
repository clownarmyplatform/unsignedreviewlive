import type { SupabaseClient } from "@supabase/supabase-js";
import { type Database } from "@/lib/supabase/types";
import {
  getStrongestModerationSignal,
  type ImageModerationDecision,
  type ImageModerationMetadata,
} from "@/lib/media/image-moderation";

export type PersistImageModerationLogInput = {
  actorEmail: string | null;
  actorRole: "user" | "admin";
  actorUserId: string;
  metadata: ImageModerationMetadata;
  moderation: ImageModerationDecision;
  relatedNoticeboardPostId?: string | null;
  targetType: "avatar" | "noticeboard_image";
};

export async function persistImageModerationLog(
  adminClient: SupabaseClient<Database>,
  input: PersistImageModerationLogInput,
) {
  const strongestSignal = getStrongestModerationSignal(input.moderation.scores);
  const { error } = await adminClient.from("image_moderation_log").insert({
    actor_email: input.actorEmail,
    actor_role: input.actorRole,
    actor_user_id: input.actorUserId,
    ai_moderation_categories: input.moderation.categories,
    ai_moderation_checked_at: input.moderation.checkedAt,
    ai_moderation_error: input.moderation.error,
    ai_moderation_model: input.moderation.model,
    ai_moderation_scores: input.moderation.scores,
    file_content_type: input.metadata.contentType,
    file_name: input.metadata.fileName,
    file_sha256: input.metadata.sha256,
    file_size_bytes: input.metadata.sizeBytes,
    moderation_status: input.moderation.status,
    related_noticeboard_post_id: input.relatedNoticeboardPostId ?? null,
    strongest_category: strongestSignal.category,
    strongest_score: strongestSignal.score,
    target_type: input.targetType,
  });

  if (error) {
    throw new Error(error.message);
  }
}
