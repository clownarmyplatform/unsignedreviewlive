import type { Database } from "@/lib/supabase/types";

export const NOTICEBOARD_IMAGE_BUCKET = "noticeboard-images";
export const NOTICEBOARD_IMAGE_MAX_BYTES = 2 * 1024 * 1024;

export type NoticeboardPost =
  Database["public"]["Functions"]["get_noticeboard_posts"]["Returns"][number];

export function formatNoticeboardDate(value: string) {
  return new Intl.DateTimeFormat("en-GB", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  }).format(new Date(value));
}

export function createNoticeboardImagePath(fileName: string) {
  const extension = fileName.includes(".")
    ? fileName.slice(fileName.lastIndexOf(".")).toLowerCase()
    : "";
  const baseName = fileName
    .replace(/\.[^/.]+$/, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 40);

  return `noticeboard/${Date.now()}-${baseName || "image"}${extension}`;
}
