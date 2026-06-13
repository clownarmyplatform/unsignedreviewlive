import type { Database } from "@/lib/supabase/types";

type ModerationTone = "accent" | "warning" | "neutral" | "success";

export type ModerationUserRow =
  Database["public"]["Functions"]["get_moderation_users"]["Returns"][number];

export type ModerationSubmissionRow =
  Database["public"]["Functions"]["get_moderation_submissions"]["Returns"][number];

export type ModerationAuditRow =
  Database["public"]["Functions"]["get_recent_moderation_actions"]["Returns"][number];

export function formatModerationDate(value: string) {
  return new Intl.DateTimeFormat("en-GB", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  }).format(new Date(value));
}

export function moderationStatusTone(status: string): ModerationTone {
  if (status === "approved" || status === "active") {
    return "success";
  }

  if (status === "suspended" || status === "rejected" || status === "removed") {
    return "warning";
  }

  return "neutral";
}

export function formatModerationActionLabel(actionType: string) {
  return actionType.replace(/_/g, " ");
}
