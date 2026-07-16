const ALWAYS_REVIEW_CATEGORIES = new Set([
  "harassment",
  "harassment/threatening",
  "hate",
  "hate/threatening",
  "illicit",
  "illicit/violent",
  "self-harm",
  "self-harm/instructions",
  "self-harm/intent",
  "sexual/minors",
  "violence/graphic",
]);

const SCORE_REVIEW_THRESHOLDS: Record<string, number> = {
  sexual: 0.78,
  violence: 0.82,
};

export type ModerationCategoryMap = Record<string, boolean> | null;
export type ModerationScoreMap = Record<string, number> | null;

function getCategoryScore(scores: ModerationScoreMap, category: string) {
  return typeof scores?.[category] === "number" ? scores[category] : 0;
}

export function shouldRequireTrackSubmissionManualReview(
  rawFlagged: boolean,
  categories: ModerationCategoryMap,
  scores: ModerationScoreMap,
) {
  if (!rawFlagged) {
    return false;
  }

  const flaggedCategories = Object.entries(categories ?? {})
    .filter(([, flagged]) => flagged === true)
    .map(([category]) => category);

  if (flaggedCategories.length === 0) {
    return true;
  }

  if (flaggedCategories.some((category) => ALWAYS_REVIEW_CATEGORIES.has(category))) {
    return true;
  }

  return Object.entries(SCORE_REVIEW_THRESHOLDS).some(
    ([category, threshold]) => getCategoryScore(scores, category) >= threshold,
  );
}
