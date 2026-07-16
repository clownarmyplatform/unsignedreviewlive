import type {
  PersistSubmissionInput,
  SubmissionModerationDecision,
  SubmissionRecord,
  SubmissionUser,
} from "@/lib/submissions/track-submission";
import {
  getTrackSubmissionSuccessMessage,
  normalizeTrackSubmissionPayload,
  TrackSubmissionError,
} from "@/lib/submissions/track-submission";

export type TrackSubmissionRequestDeps = {
  getUserFromAccessToken: (accessToken: string) => Promise<SubmissionUser | null>;
  moderateSubmission: (
    submission: PersistSubmissionInput["submission"],
  ) => Promise<SubmissionModerationDecision>;
  persistSubmission: (input: PersistSubmissionInput) => Promise<SubmissionRecord>;
};

function extractBearerToken(headerValue: string | null) {
  if (!headerValue?.startsWith("Bearer ")) {
    return null;
  }

  return headerValue.slice("Bearer ".length).trim() || null;
}

function jsonResponse(body: unknown, status: number) {
  return Response.json(body, { status });
}

export async function handleTrackSubmissionRequest(
  request: Request,
  deps: TrackSubmissionRequestDeps,
) {
  try {
    const accessToken = extractBearerToken(request.headers.get("authorization"));

    if (!accessToken) {
      throw new TrackSubmissionError(
        "UNAUTHENTICATED",
        "You must be signed in to submit a track.",
        401,
      );
    }

    let payload: unknown;

    try {
      payload = await request.json();
    } catch {
      throw new TrackSubmissionError(
        "INVALID_INPUT",
        "Submission details are missing or invalid.",
        400,
      );
    }

    const submission = normalizeTrackSubmissionPayload(payload);
    const user = await deps.getUserFromAccessToken(accessToken);

    if (!user) {
      throw new TrackSubmissionError(
        "UNAUTHENTICATED",
        "You must be signed in to submit a track.",
        401,
      );
    }

    const moderation = await deps.moderateSubmission(submission);
    const savedSubmission = await deps.persistSubmission({
      moderation,
      submission,
      user,
    });

    return jsonResponse(
      {
        message: getTrackSubmissionSuccessMessage(savedSubmission),
        submission: savedSubmission,
      },
      200,
    );
  } catch (error) {
    if (error instanceof TrackSubmissionError) {
      return jsonResponse({ error: error.message }, error.status);
    }

    return jsonResponse(
      {
        error: "We could not submit your track right now. Please try again.",
      },
      500,
    );
  }
}
