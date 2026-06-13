import type { Database } from "@/lib/supabase/types";

export const MIN_GLOBAL_SEARCH_QUERY_LENGTH = 2;
export const GLOBAL_SEARCH_DEBOUNCE_MS = 300;

export type GlobalSearchResult =
  Database["public"]["Functions"]["search_global_content"]["Returns"][number];

export const GLOBAL_SEARCH_GROUPS = [
  { key: "show", label: "Shows" },
  { key: "noticeboard", label: "Noticeboard" },
  { key: "track", label: "Tracks" },
] as const;

export function groupGlobalSearchResults(results: GlobalSearchResult[]) {
  return GLOBAL_SEARCH_GROUPS.map((group) => ({
    ...group,
    results: results.filter((result) => result.result_type === group.key),
  }));
}

export function formatGlobalSearchDate(value: string | null) {
  if (!value) {
    return null;
  }

  return new Date(value).toLocaleString("en-GB", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export function getGlobalSearchTypeLabel(resultType: GlobalSearchResult["result_type"]) {
  if (resultType === "show") {
    return "Show";
  }

  if (resultType === "noticeboard") {
    return "Noticeboard";
  }

  return "Track";
}
