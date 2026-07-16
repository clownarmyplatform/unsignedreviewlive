import assert from "node:assert/strict";
import test from "node:test";
import { handleTrackSubmissionRequest } from "../src/lib/submissions/handle-track-submission-request";
import {
  buildModerationInput,
  type PersistSubmissionInput,
  type SubmissionModerationDecision,
  type SubmissionRecord,
  TrackSubmissionError,
} from "../src/lib/submissions/track-submission";

const baseSubmission = {
  artist_name: "Neon Drift",
  track_title: "Midnight Signal",
  track_url: "https://example.com/track",
  genre: "Synthwave",
  message: "Please review this for next Wednesday.",
  rights_confirmed: true,
  submission_attempt_id: "3de46e4a-1dc8-4bb7-b55d-d6703bdf1a0f",
};

const baseSavedSubmission: SubmissionRecord = {
  id: "e2490f09-4f72-4254-8a3b-f3fe99b4b0b7",
  show_id: "64cfbd16-51da-4851-b3f7-790da3de251a",
  artist_id: null,
  auth_user_id: "59f55a03-0b3a-4d55-a03d-b98d8e1fbc10",
  submitter_email: "creator@example.com",
  submission_attempt_id: baseSubmission.submission_attempt_id,
  artist_name: "Neon Drift",
  track_title: "Midnight Signal",
  track_url: "https://example.com/track",
  genre: "Synthwave",
  message: "Please review this for next Wednesday.",
  rights_confirmed: true,
  status: "pending",
  moderation_status: "pending_review",
  ai_moderation_status: "clean",
  requires_manual_review: false,
  ai_moderation_categories: null,
  ai_moderation_scores: null,
  ai_moderation_model: "omni-moderation-latest",
  ai_moderation_checked_at: "2026-07-16T12:00:00.000Z",
  ai_moderation_error: null,
  moderated_at: null,
  moderated_by_user_id: null,
  created_at: "2026-07-16T12:00:00.000Z",
};

function createDeps(overrides?: {
  moderation?: SubmissionModerationDecision;
  persistSubmission?: (input: PersistSubmissionInput) => Promise<SubmissionRecord>;
  userFound?: boolean;
}) {
  const moderation =
    overrides?.moderation ??
    ({
      categories: null,
      checkedAt: "2026-07-16T12:00:00.000Z",
      error: null,
      model: "omni-moderation-latest",
      requiresManualReview: false,
      scores: null,
      status: "clean",
    } satisfies SubmissionModerationDecision);

  return {
    async getUserFromAccessToken(accessToken: string) {
      assert.equal(accessToken, "test-token");

      if (overrides?.userFound === false) {
        return null;
      }

      return {
        email: "creator@example.com",
        id: "59f55a03-0b3a-4d55-a03d-b98d8e1fbc10",
      };
    },
    async moderateSubmission(submission: PersistSubmissionInput["submission"]) {
      assert.match(buildModerationInput(submission), /Artist name: Neon Drift/);
      return moderation;
    },
    persistSubmission:
      overrides?.persistSubmission ??
      (async () => ({
        ...baseSavedSubmission,
        ai_moderation_status: moderation.status,
        requires_manual_review: moderation.requiresManualReview,
        ai_moderation_categories: moderation.categories,
        ai_moderation_scores: moderation.scores,
        ai_moderation_model: moderation.model,
        ai_moderation_checked_at: moderation.checkedAt,
        ai_moderation_error: moderation.error,
      })),
  };
}

async function readJson(response: Response) {
  return (await response.json()) as Record<string, unknown>;
}

function createRequest(body: unknown, includeAuth = true) {
  return new Request("http://localhost/api/submissions", {
    method: "POST",
    headers: includeAuth
      ? {
          "Content-Type": "application/json",
          Authorization: "Bearer test-token",
        }
      : {
          "Content-Type": "application/json",
        },
    body: JSON.stringify(body),
  });
}

test("accepts clean input and returns the saved submission", async () => {
  const response = await handleTrackSubmissionRequest(
    createRequest(baseSubmission),
    createDeps(),
  );
  const payload = await readJson(response);

  assert.equal(response.status, 200);
  assert.equal(
    payload.message,
    "Track submitted. It is now waiting for moderation review before it can appear publicly.",
  );
  assert.equal(
    (payload.submission as SubmissionRecord).ai_moderation_status,
    "clean",
  );
});

test("keeps flagged input in manual review without exposing categories to the user response", async () => {
  const response = await handleTrackSubmissionRequest(
    createRequest(baseSubmission),
    createDeps({
      moderation: {
        categories: { harassment: true, violence: false },
        checkedAt: "2026-07-16T12:00:00.000Z",
        error: null,
        model: "omni-moderation-latest",
        requiresManualReview: true,
        scores: { harassment: 0.98, violence: 0.02 },
        status: "flagged",
      },
    }),
  );
  const payload = await readJson(response);
  const submission = payload.submission as SubmissionRecord;

  assert.equal(response.status, 200);
  assert.equal(submission.ai_moderation_status, "flagged");
  assert.equal(submission.requires_manual_review, true);
  assert.equal(
    payload.message,
    "Track submitted. It has been held for moderation review before it can appear publicly.",
  );
});

test("saves for manual review when moderation fails", async () => {
  const response = await handleTrackSubmissionRequest(
    createRequest(baseSubmission),
    createDeps({
      moderation: {
        categories: null,
        checkedAt: "2026-07-16T12:00:00.000Z",
        error: "timeout",
        model: "omni-moderation-latest",
        requiresManualReview: true,
        scores: null,
        status: "error",
      },
    }),
  );
  const payload = await readJson(response);
  const submission = payload.submission as SubmissionRecord;

  assert.equal(response.status, 200);
  assert.equal(submission.ai_moderation_status, "error");
  assert.equal(submission.requires_manual_review, true);
});

test("handles duplicate retries idempotently", async () => {
  const deps = createDeps({
    persistSubmission: async () => baseSavedSubmission,
  });

  const firstResponse = await handleTrackSubmissionRequest(
    createRequest(baseSubmission),
    deps,
  );
  const secondResponse = await handleTrackSubmissionRequest(
    createRequest(baseSubmission),
    deps,
  );
  const secondPayload = await readJson(secondResponse);

  assert.equal(firstResponse.status, 200);
  assert.equal(secondResponse.status, 200);
  assert.equal(
    (secondPayload.submission as SubmissionRecord).submission_attempt_id,
    baseSubmission.submission_attempt_id,
  );
});

test("returns queue-capacity errors gracefully", async () => {
  const response = await handleTrackSubmissionRequest(
    createRequest(baseSubmission),
    createDeps({
      persistSubmission: async () => {
        throw new TrackSubmissionError(
          "QUEUE_FULL",
          "Sorry, the queue for this show is full",
          409,
        );
      },
    }),
  );
  const payload = await readJson(response);

  assert.equal(response.status, 409);
  assert.equal(payload.error, "Sorry, the queue for this show is full");
});

test("rejects unauthenticated submissions", async () => {
  const response = await handleTrackSubmissionRequest(
    createRequest(baseSubmission, false),
    createDeps(),
  );
  const payload = await readJson(response);

  assert.equal(response.status, 401);
  assert.equal(payload.error, "You must be signed in to submit a track.");
});

test("rejects malformed input", async () => {
  const response = await handleTrackSubmissionRequest(
    createRequest({
      ...baseSubmission,
      track_url: "not-a-url",
    }),
    createDeps(),
  );
  const payload = await readJson(response);

  assert.equal(response.status, 400);
  assert.equal(payload.error, "Track URL must be a valid http or https link.");
});
