import "server-only";

import OpenAI from "openai";
import type {
  NormalizedTrackSubmission,
  SubmissionModerationDecision,
} from "@/lib/submissions/track-submission";
import { buildModerationInput } from "@/lib/submissions/track-submission";
import { shouldRequireTrackSubmissionManualReview } from "@/lib/submissions/moderation-policy";

const MODERATION_MODEL = "omni-moderation-latest";
const DEFAULT_MODERATION_TIMEOUT_MS = 8_000;

function getModerationTimeoutMs() {
  const parsed = Number(process.env.OPENAI_MODERATION_TIMEOUT_MS ?? "");

  if (!Number.isFinite(parsed) || parsed <= 0) {
    return DEFAULT_MODERATION_TIMEOUT_MS;
  }

  return parsed;
}

function getOpenAiClient() {
  const apiKey = process.env.OPENAI_API_KEY;

  if (!apiKey) {
    return null;
  }

  return new OpenAI({ apiKey });
}

function nowIsoString() {
  return new Date().toISOString();
}

function resolveModerationErrorReason(error: unknown) {
  if (error instanceof Error && error.name === "TimeoutError") {
    return "timeout";
  }

  if (
    typeof error === "object" &&
    error &&
    "name" in error &&
    error.name === "AbortError"
  ) {
    return "timeout";
  }

  return "api_error";
}

export async function moderateTrackSubmission(
  submission: NormalizedTrackSubmission,
): Promise<SubmissionModerationDecision> {
  const client = getOpenAiClient();
  const checkedAt = nowIsoString();

  if (!client) {
    return {
      categories: null,
      checkedAt,
      error: "not_configured",
      model: MODERATION_MODEL,
      requiresManualReview: true,
      scores: null,
      status: "error",
    };
  }

  try {
    const response = await client.moderations.create(
      {
        model: MODERATION_MODEL,
        input: buildModerationInput(submission),
      },
      {
        signal: AbortSignal.timeout(getModerationTimeoutMs()),
      },
    );

    const result = response.results[0];
    const categories = result?.categories
      ? (result.categories as unknown as Record<string, boolean>)
      : null;
    const scores = result?.category_scores
      ? (result.category_scores as unknown as Record<string, number>)
      : null;
    const rawFlagged = Boolean(result?.flagged);

    return {
      categories,
      checkedAt,
      error: null,
      model: response.model ?? MODERATION_MODEL,
      requiresManualReview: shouldRequireTrackSubmissionManualReview(
        rawFlagged,
        categories,
        scores,
      ),
      scores,
      status: rawFlagged ? "flagged" : "clean",
    };
  } catch (error) {
    return {
      categories: null,
      checkedAt,
      error: resolveModerationErrorReason(error),
      model: MODERATION_MODEL,
      requiresManualReview: true,
      scores: null,
      status: "error",
    };
  }
}
