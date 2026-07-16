import "server-only";

import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/lib/supabase/types";
import type {
  PersistSubmissionInput,
  SubmissionRecord,
} from "@/lib/submissions/track-submission";
import { TrackSubmissionError } from "@/lib/submissions/track-submission";

function mapSubmissionPersistenceError(message: string) {
  if (message.includes("already have a track submitted")) {
    return new TrackSubmissionError(
      "ALREADY_SUBMITTED",
      "You already have a track submitted for this show. Please edit your existing submission from your dashboard.",
      409,
    );
  }

  if (message.includes("queue for this show is full")) {
    return new TrackSubmissionError("QUEUE_FULL", "Sorry, the queue for this show is full", 409);
  }

  if (message.includes("No upcoming show is currently accepting submissions")) {
    return new TrackSubmissionError(
      "SUBMISSIONS_CLOSED",
      "Submissions are not open right now.",
      409,
    );
  }

  if (message.includes("account is suspended")) {
    return new TrackSubmissionError(
      "SUSPENDED_ACCOUNT",
      "Your account is suspended. Track submission is unavailable.",
      403,
    );
  }

  return new TrackSubmissionError(
    "UNEXPECTED",
    "We could not submit your track right now. Please try again.",
    500,
  );
}

export async function persistTrackSubmission(
  adminClient: SupabaseClient<Database>,
  input: PersistSubmissionInput,
): Promise<SubmissionRecord> {
  const { data, error } = await adminClient.rpc("create_submission_after_ai_moderation", {
    p_auth_user_id: input.user.id,
    p_submitter_email: input.user.email,
    p_artist_name: input.submission.artistName,
    p_track_title: input.submission.trackTitle,
    p_track_url: input.submission.trackUrl,
    p_genre: input.submission.genre,
    p_message: input.submission.message,
    p_rights_confirmed: input.submission.rightsConfirmed,
    p_submission_attempt_id: input.submission.submissionAttemptId,
    p_ai_moderation_status: input.moderation.status,
    p_requires_manual_review: input.moderation.requiresManualReview,
    p_ai_moderation_categories: input.moderation.categories,
    p_ai_moderation_scores: input.moderation.scores,
    p_ai_moderation_model: input.moderation.model,
    p_ai_moderation_checked_at: input.moderation.checkedAt,
    p_ai_moderation_error: input.moderation.error,
  });

  if (error) {
    throw mapSubmissionPersistenceError(error.message);
  }

  if (!data) {
    throw new TrackSubmissionError(
      "UNEXPECTED",
      "We could not submit your track right now. Please try again.",
      500,
    );
  }

  return data;
}
