import type { Database } from "@/lib/supabase/types";

export const TRACK_SUBMISSION_LIMITS = {
  artistName: 120,
  trackTitle: 160,
  genre: 120,
  message: 1000,
  trackUrl: 2048,
} as const;

export type SubmissionAiModerationStatus =
  Database["public"]["Tables"]["submissions"]["Row"]["ai_moderation_status"];

export type SubmissionModerationStatus =
  Database["public"]["Tables"]["submissions"]["Row"]["moderation_status"];

export type SubmissionRecord = Database["public"]["Tables"]["submissions"]["Row"];

export type NormalizedTrackSubmission = {
  artistName: string;
  trackTitle: string;
  trackUrl: string;
  genre: string;
  message: string | null;
  rightsConfirmed: boolean;
  submissionAttemptId: string;
};

export type SubmissionUser = {
  email: string | null;
  id: string;
};

export type SubmissionModerationDecision = {
  categories: Record<string, boolean> | null;
  checkedAt: string;
  error: string | null;
  model: string;
  requiresManualReview: boolean;
  scores: Record<string, number> | null;
  status: Exclude<SubmissionAiModerationStatus, "unchecked">;
};

export type PersistSubmissionInput = {
  moderation: SubmissionModerationDecision;
  submission: NormalizedTrackSubmission;
  user: SubmissionUser;
};

export type TrackSubmissionErrorCode =
  | "ALREADY_SUBMITTED"
  | "INVALID_INPUT"
  | "QUEUE_FULL"
  | "SUBMISSIONS_CLOSED"
  | "SUSPENDED_ACCOUNT"
  | "UNAUTHENTICATED"
  | "UNEXPECTED";

export class TrackSubmissionError extends Error {
  code: TrackSubmissionErrorCode;
  status: number;

  constructor(code: TrackSubmissionErrorCode, message: string, status: number) {
    super(message);
    this.code = code;
    this.status = status;
  }
}

function readString(value: unknown) {
  return typeof value === "string" ? value.trim() : "";
}

function assertMaxLength(label: string, value: string, maxLength: number) {
  if (value.length > maxLength) {
    throw new TrackSubmissionError(
      "INVALID_INPUT",
      `${label} must be ${maxLength} characters or fewer.`,
      400,
    );
  }
}

function parseTrackUrl(rawValue: string) {
  if (!rawValue) {
    throw new TrackSubmissionError(
      "INVALID_INPUT",
      "Track URL is required.",
      400,
    );
  }

  let parsedUrl: URL;

  try {
    parsedUrl = new URL(rawValue);
  } catch {
    throw new TrackSubmissionError(
      "INVALID_INPUT",
      "Track URL must be a valid http or https link.",
      400,
    );
  }

  if (parsedUrl.protocol !== "http:" && parsedUrl.protocol !== "https:") {
    throw new TrackSubmissionError(
      "INVALID_INPUT",
      "Track URL must be a valid http or https link.",
      400,
    );
  }

  const normalized = parsedUrl.toString();
  assertMaxLength("Track URL", normalized, TRACK_SUBMISSION_LIMITS.trackUrl);

  return normalized;
}

function parseAttemptId(rawValue: unknown) {
  const attemptId = readString(rawValue);

  if (!attemptId) {
    throw new TrackSubmissionError(
      "INVALID_INPUT",
      "Submission attempt ID is required.",
      400,
    );
  }

  const uuidPattern =
    /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

  if (!uuidPattern.test(attemptId)) {
    throw new TrackSubmissionError(
      "INVALID_INPUT",
      "Submission attempt ID is invalid.",
      400,
    );
  }

  return attemptId;
}

export function normalizeTrackSubmissionPayload(
  payload: unknown,
): NormalizedTrackSubmission {
  if (!payload || typeof payload !== "object" || Array.isArray(payload)) {
    throw new TrackSubmissionError(
      "INVALID_INPUT",
      "Submission details are missing or invalid.",
      400,
    );
  }

  const record = payload as Record<string, unknown>;
  const artistName = readString(record.artist_name);
  const trackTitle = readString(record.track_title);
  const genre = readString(record.genre);
  const message = readString(record.message);
  const rightsConfirmed = record.rights_confirmed === true;

  if (!artistName || !trackTitle || !genre || !rightsConfirmed) {
    throw new TrackSubmissionError(
      "INVALID_INPUT",
      "Please complete every required field and confirm you have the rights to submit the track.",
      400,
    );
  }

  assertMaxLength("Artist name", artistName, TRACK_SUBMISSION_LIMITS.artistName);
  assertMaxLength("Track title", trackTitle, TRACK_SUBMISSION_LIMITS.trackTitle);
  assertMaxLength("Genre", genre, TRACK_SUBMISSION_LIMITS.genre);
  assertMaxLength("Message", message, TRACK_SUBMISSION_LIMITS.message);

  return {
    artistName,
    trackTitle,
    trackUrl: parseTrackUrl(readString(record.track_url)),
    genre,
    message: message || null,
    rightsConfirmed,
    submissionAttemptId: parseAttemptId(record.submission_attempt_id),
  };
}

export function buildModerationInput(submission: NormalizedTrackSubmission) {
  return [
    `Artist name: ${submission.artistName}`,
    `Track title: ${submission.trackTitle}`,
    `Genre: ${submission.genre}`,
    `Message: ${submission.message ?? "(none provided)"}`,
  ].join("\n");
}

export function getTrackSubmissionSuccessMessage(submission: SubmissionRecord) {
  if (submission.requires_manual_review || submission.ai_moderation_status === "error") {
    return "Track submitted. It has been held for moderation review before it can appear publicly.";
  }

  return "Track submitted. It is now waiting for moderation review before it can appear publicly.";
}
