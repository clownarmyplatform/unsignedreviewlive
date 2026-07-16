import { createHash } from "node:crypto";
import OpenAI from "openai";

const MODERATION_MODEL = "omni-moderation-latest";
const DEFAULT_MODERATION_TIMEOUT_MS = 8_000;

export type ImageModerationDecision = {
  categories: Record<string, boolean> | null;
  checkedAt: string;
  error: string | null;
  model: string;
  scores: Record<string, number> | null;
  status: "clean" | "flagged" | "error";
};

export type ImageModerationMetadata = {
  contentType: string;
  fileName: string | null;
  sha256: string;
  sizeBytes: number;
};

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

export function createImageModerationMetadata(file: File, buffer: Buffer) {
  return {
    contentType: file.type,
    fileName: file.name || null,
    sha256: createHash("sha256").update(buffer).digest("hex"),
    sizeBytes: buffer.byteLength,
  } satisfies ImageModerationMetadata;
}

export function getStrongestModerationSignal(scores: Record<string, number> | null) {
  if (!scores) {
    return {
      category: null,
      score: null,
    };
  }

  let strongestCategory: string | null = null;
  let strongestScore: number | null = null;

  for (const [category, score] of Object.entries(scores)) {
    if (strongestScore === null || score > strongestScore) {
      strongestCategory = category;
      strongestScore = score;
    }
  }

  return {
    category: strongestCategory,
    score: strongestScore,
  };
}

export async function moderateImageBuffer(input: {
  buffer: Buffer;
  contentType: string;
}): Promise<ImageModerationDecision> {
  const client = getOpenAiClient();
  const checkedAt = nowIsoString();

  if (!client) {
    return {
      categories: null,
      checkedAt,
      error: "not_configured",
      model: MODERATION_MODEL,
      scores: null,
      status: "error",
    };
  }

  try {
    const dataUrl = `data:${input.contentType};base64,${input.buffer.toString("base64")}`;
    const response = await client.moderations.create(
      {
        model: MODERATION_MODEL,
        input: [
          {
            type: "image_url",
            image_url: {
              url: dataUrl,
            },
          },
        ],
      },
      {
        signal: AbortSignal.timeout(getModerationTimeoutMs()),
      },
    );

    const result = response.results[0];

    return {
      categories: result?.categories
        ? (result.categories as unknown as Record<string, boolean>)
        : null,
      checkedAt,
      error: null,
      model: response.model ?? MODERATION_MODEL,
      scores: result?.category_scores
        ? (result.category_scores as unknown as Record<string, number>)
        : null,
      status: result?.flagged ? "flagged" : "clean",
    };
  } catch (error) {
    return {
      categories: null,
      checkedAt,
      error: resolveModerationErrorReason(error),
      model: MODERATION_MODEL,
      scores: null,
      status: "error",
    };
  }
}
