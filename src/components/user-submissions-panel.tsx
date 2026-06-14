"use client";

import { useEffect, useState, useTransition } from "react";
import { useAuth } from "@/components/providers/auth-provider";
import { SectionCard } from "@/components/ui/section-card";
import { StatusPill } from "@/components/ui/status-pill";
import { UserAvatar } from "@/components/ui/user-avatar";
import { getSupabaseBrowserClient } from "@/lib/supabase/client";
import type { Database } from "@/lib/supabase/types";

type SubmissionRow = Database["public"]["Tables"]["submissions"]["Row"];

type EditState = {
  artist_name: string;
  track_title: string;
  track_url: string;
  genre: string;
  message: string;
  rights_confirmed: boolean;
};

type EditMessage =
  | {
      type: "success" | "error";
      text: string;
    }
  | null;

const statusToneMap = {
  pending: "warning",
  queued: "accent",
  played: "success",
  reviewed: "success",
  rejected: "neutral",
} as const;

function formatSubmissionDate(value: string) {
  return new Intl.DateTimeFormat("en-GB", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  }).format(new Date(value));
}

function canEditSubmission(status: SubmissionRow["status"]) {
  return status === "pending" || status === "queued";
}

function formatSubmissionStatus(submission: SubmissionRow) {
  if (submission.moderation_status === "rejected") {
    return "Rejected";
  }

  if (submission.moderation_status === "removed") {
    return "Removed";
  }

  if (submission.status === "pending") {
    return "Submitted";
  }

  return submission.status;
}

function toEditState(submission: SubmissionRow): EditState {
  return {
    artist_name: submission.artist_name,
    track_title: submission.track_title,
    track_url: submission.track_url,
    genre: submission.genre,
    message: submission.message ?? "",
    rights_confirmed: submission.rights_confirmed,
  };
}

export function UserSubmissionsPanel() {
  const { profile, user } = useAuth();
  const [submissions, setSubmissions] = useState<SubmissionRow[]>([]);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editValues, setEditValues] = useState<EditState | null>(null);
  const [editMessage, setEditMessage] = useState<EditMessage>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  useEffect(() => {
    let isMounted = true;

    async function load() {
      if (!user) {
        if (isMounted) {
          setSubmissions([]);
          setErrorMessage(null);
          setIsLoading(false);
        }
        return;
      }

      try {
        const supabase = getSupabaseBrowserClient();
        const { data, error } = await supabase
          .from("submissions")
          .select("*")
          .eq("auth_user_id", user.id)
          .order("created_at", { ascending: false });

        if (!isMounted) {
          return;
        }

        if (error) {
          setErrorMessage(error.message);
          return;
        }

        setErrorMessage(null);
        setSubmissions(data ?? []);
      } catch {
        if (isMounted) {
          setErrorMessage("Could not load your submissions right now.");
        }
      } finally {
        if (isMounted) {
          setIsLoading(false);
        }
      }
    }

    load();

    return () => {
      isMounted = false;
    };
  }, [user]);

  function startEditing(submission: SubmissionRow) {
    setEditingId(submission.id);
    setEditValues(toEditState(submission));
    setEditMessage(null);
  }

  function stopEditing() {
    setEditingId(null);
    setEditValues(null);
    setEditMessage(null);
  }

  function updateEditValue<K extends keyof EditState>(key: K, value: EditState[K]) {
    setEditValues((current) => (current ? { ...current, [key]: value } : current));
  }

  function handleEditSubmit(submissionId: string) {
    if (!editValues) {
      return;
    }

    startTransition(async () => {
      setEditMessage(null);

      if (
        !editValues.artist_name.trim() ||
        !editValues.track_title.trim() ||
        !editValues.track_url.trim() ||
        !editValues.genre.trim() ||
        !editValues.rights_confirmed
      ) {
        setEditMessage({
          type: "error",
          text: "Please complete every required field and keep the rights confirmation checked.",
        });
        return;
      }

      try {
        const supabase = getSupabaseBrowserClient();
        const { data, error } = await supabase.rpc("update_own_submission", {
          p_submission_id: submissionId,
          p_artist_name: editValues.artist_name.trim(),
          p_track_title: editValues.track_title.trim(),
          p_track_url: editValues.track_url.trim(),
          p_genre: editValues.genre.trim(),
          p_message: editValues.message.trim() || null,
          p_rights_confirmed: editValues.rights_confirmed,
        });

        if (error) {
          setEditMessage({
            type: "error",
            text: error.message,
          });
          return;
        }

        setSubmissions((current) =>
          current.map((submission) =>
            submission.id === submissionId ? data : submission,
          ),
        );
        setEditMessage({
          type: "success",
          text: "Submission updated. Its place in the queue has not changed.",
        });
      } catch (error) {
        setEditMessage({
          type: "error",
          text:
            error instanceof Error
              ? error.message
              : "Something went wrong while saving your changes.",
        });
      }
    });
  }

  return (
    <SectionCard
      title="Your Submitted Tracks"
      description="One track per show. If you make a mistake, you can edit your submission here without changing its place in line."
    >
      {isLoading ? (
        <div className="rounded-[22px] border border-white/10 bg-white/[0.03] p-4 text-sm leading-6 text-zinc-300">
          Loading your live submissions...
        </div>
      ) : errorMessage ? (
        <div className="rounded-[22px] border border-rose-400/30 bg-rose-400/10 p-4 text-sm leading-6 text-rose-100">
          {errorMessage}
        </div>
      ) : submissions.length > 0 ? (
        <div className="space-y-3">
          {submissions.map((submission) => {
            const isEditing = editingId === submission.id && editValues;
            const isEditable =
              submission.moderation_status === "approved" &&
              canEditSubmission(submission.status);

            return (
              <div
                key={submission.id}
                className="rounded-[22px] border border-white/10 bg-white/[0.03] p-4"
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="flex items-start gap-3">
                    <UserAvatar
                      imageUrl={profile?.avatarUrl}
                      name={submission.artist_name}
                      className="h-11 w-11"
                      textClassName="text-xs"
                    />
                    <div>
                      <p className="font-semibold text-white">
                        {submission.artist_name} - {submission.track_title}
                      </p>
                      <p className="mt-1 text-sm text-zinc-400">
                        {submission.genre} | {formatSubmissionDate(submission.created_at)}
                      </p>
                    </div>
                  </div>
                  <StatusPill
                    tone={
                      submission.moderation_status === "approved"
                        ? statusToneMap[submission.status]
                        : "warning"
                    }
                  >
                    {formatSubmissionStatus(submission)}
                  </StatusPill>
                </div>

                <p className="mt-3 break-all text-sm leading-6 text-zinc-300">
                  {submission.track_url}
                </p>

                {submission.message ? (
                  <p className="mt-3 text-sm leading-6 text-zinc-300">
                    {submission.message}
                  </p>
                ) : null}

                {isEditable ? (
                  <div className="mt-4">
                    {!isEditing ? (
                      <button
                        type="button"
                        onClick={() => startEditing(submission)}
                        className="min-h-12 rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-sm font-bold uppercase tracking-[0.12em] text-white transition hover:bg-white/10"
                      >
                        Edit Submission
                      </button>
                    ) : (
                      <div className="space-y-4 rounded-[22px] border border-white/10 bg-black/20 p-4">
                        <div className="grid gap-4 md:grid-cols-2">
                          <label className="block">
                            <span className="mb-2 block text-sm font-medium text-zinc-200">
                              Artist name
                            </span>
                            <input
                              value={editValues.artist_name}
                              onChange={(event) =>
                                updateEditValue("artist_name", event.target.value)
                              }
                              className="min-h-12 w-full rounded-2xl border border-white/10 bg-white/[0.04] px-4 text-white outline-none transition focus:border-amber-300/60"
                            />
                          </label>

                          <label className="block">
                            <span className="mb-2 block text-sm font-medium text-zinc-200">
                              Track title
                            </span>
                            <input
                              value={editValues.track_title}
                              onChange={(event) =>
                                updateEditValue("track_title", event.target.value)
                              }
                              className="min-h-12 w-full rounded-2xl border border-white/10 bg-white/[0.04] px-4 text-white outline-none transition focus:border-amber-300/60"
                            />
                          </label>

                          <label className="block">
                            <span className="mb-2 block text-sm font-medium text-zinc-200">
                              Link URL
                            </span>
                            <input
                              type="url"
                              value={editValues.track_url}
                              onChange={(event) =>
                                updateEditValue("track_url", event.target.value)
                              }
                              className="min-h-12 w-full rounded-2xl border border-white/10 bg-white/[0.04] px-4 text-white outline-none transition focus:border-amber-300/60"
                            />
                          </label>

                          <label className="block">
                            <span className="mb-2 block text-sm font-medium text-zinc-200">
                              Genre
                            </span>
                            <input
                              value={editValues.genre}
                              onChange={(event) =>
                                updateEditValue("genre", event.target.value)
                              }
                              className="min-h-12 w-full rounded-2xl border border-white/10 bg-white/[0.04] px-4 text-white outline-none transition focus:border-amber-300/60"
                            />
                          </label>
                        </div>

                        <label className="block">
                          <span className="mb-2 block text-sm font-medium text-zinc-200">
                            Optional message
                          </span>
                          <textarea
                            rows={4}
                            value={editValues.message}
                            onChange={(event) =>
                              updateEditValue("message", event.target.value)
                            }
                            className="w-full rounded-2xl border border-white/10 bg-white/[0.04] px-4 py-3 text-white outline-none transition focus:border-amber-300/60"
                          />
                        </label>

                        <label className="flex items-start gap-3 rounded-2xl border border-white/10 bg-white/[0.03] p-4">
                          <input
                            type="checkbox"
                            checked={editValues.rights_confirmed}
                            onChange={(event) =>
                              updateEditValue(
                                "rights_confirmed",
                                event.target.checked,
                              )
                            }
                            className="mt-1 h-5 w-5 rounded border-white/10 bg-transparent accent-amber-300"
                          />
                          <span className="text-sm leading-6 text-zinc-300">
                            I still confirm that I own this track or have the rights
                            and permission to submit it for play and review.
                          </span>
                        </label>

                        {editMessage ? (
                          <div
                            className={`rounded-2xl border px-4 py-3 text-sm leading-6 ${
                              editMessage.type === "success"
                                ? "border-emerald-400/30 bg-emerald-400/10 text-emerald-100"
                                : "border-rose-400/30 bg-rose-400/10 text-rose-100"
                            }`}
                          >
                            {editMessage.text}
                          </div>
                        ) : null}

                        <div className="flex flex-wrap gap-3">
                          <button
                            type="button"
                            onClick={() => handleEditSubmit(submission.id)}
                            disabled={isPending}
                            className="min-h-12 rounded-2xl bg-amber-300 px-4 py-3 text-sm font-bold uppercase tracking-[0.12em] text-black transition hover:bg-amber-200 disabled:cursor-not-allowed disabled:opacity-70"
                          >
                            {isPending ? "Saving..." : "Save Changes"}
                          </button>
                          <button
                            type="button"
                            onClick={stopEditing}
                            disabled={isPending}
                            className="min-h-12 rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-sm font-bold uppercase tracking-[0.12em] text-white transition hover:bg-white/10 disabled:cursor-not-allowed disabled:opacity-70"
                          >
                            Cancel
                          </button>
                        </div>
                      </div>
                    )}
                  </div>
                ) : (
                  <p className="mt-4 text-sm leading-6 text-zinc-500">
                    {submission.moderation_status === "rejected"
                      ? "This submission was rejected by moderation."
                      : submission.moderation_status === "removed"
                        ? "This submission was removed by moderation."
                        : "Editing closed."}
                  </p>
                )}
              </div>
            );
          })}
        </div>
      ) : (
        <div className="rounded-[22px] border border-dashed border-white/10 bg-white/[0.03] p-4 text-sm leading-6 text-zinc-300">
          No submitted tracks yet.
        </div>
      )}
    </SectionCard>
  );
}
