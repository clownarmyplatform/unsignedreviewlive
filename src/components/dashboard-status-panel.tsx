"use client";

import { useEffect, useState, useTransition } from "react";
import { useAuth } from "@/components/providers/auth-provider";
import { getSupabaseBrowserClient } from "@/lib/supabase/client";
import type { Database } from "@/lib/supabase/types";
import { SectionCard } from "@/components/ui/section-card";
import { StatusPill } from "@/components/ui/status-pill";
import { UserAvatar } from "@/components/ui/user-avatar";

type AdminSnapshot =
  Database["public"]["Functions"]["get_admin_dashboard_snapshot"]["Returns"][number];
type SubmissionRow = Database["public"]["Tables"]["submissions"]["Row"];
type TotnBoardRow =
  Database["public"]["Functions"]["get_totn_board_for_active_show"]["Returns"][number];

const emptySnapshot: AdminSnapshot = {
  show_id: null,
  show_title: null,
  show_date: null,
  ends_at: null,
  submission_deadline: null,
  theme: null,
  venue: null,
  submission_count: 0,
  places_left: 30,
  unplayed_count: 0,
  totn_count: 0,
  noticeboard_count: 0,
};

function statusTone(submission: SubmissionRow | null) {
  if (submission?.moderation_status === "rejected" || submission?.moderation_status === "removed") {
    return "warning";
  }

  if (submission?.moderation_status === "pending_review") {
    return "warning";
  }

  if (submission?.status === "pending") {
    return "warning";
  }

  if (submission?.status === "queued") {
    return "accent";
  }

  if (submission?.status === "played" || submission?.status === "reviewed") {
    return "success";
  }

  return "neutral";
}

function formatSubmissionStatus(submission: SubmissionRow | null) {
  if (submission?.moderation_status === "pending_review") {
    return "In Review";
  }

  if (submission?.moderation_status === "rejected") {
    return "Rejected";
  }

  if (submission?.moderation_status === "removed") {
    return "Removed";
  }

  if (submission?.status === "pending") {
    return "Submitted";
  }

  if (!submission?.status) {
    return "Not submitted";
  }

  return submission.status;
}

export function DashboardStatusPanel() {
  const { profile, user } = useAuth();
  const [snapshot, setSnapshot] = useState<AdminSnapshot>(emptySnapshot);
  const [submission, setSubmission] = useState<SubmissionRow | null>(null);
  const [nominations, setNominations] = useState<TotnBoardRow[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [voteMessage, setVoteMessage] = useState<{
    tone: "success" | "error";
    text: string;
  } | null>(null);
  const [isPending, startTransition] = useTransition();

  useEffect(() => {
    let isMounted = true;

    async function loadDashboardStatus() {
      if (!user) {
        if (isMounted) {
          setIsLoading(false);
        }
        return;
      }

      try {
        const supabase = getSupabaseBrowserClient();
        const { data: snapshotData, error: snapshotError } = await supabase.rpc(
          "get_admin_dashboard_snapshot",
        );

        if (!isMounted) {
          return;
        }

        if (snapshotError) {
          setErrorMessage(snapshotError.message);
          return;
        }

        const nextSnapshot = snapshotData?.[0] ?? emptySnapshot;
        setSnapshot(nextSnapshot);

        if (nextSnapshot.show_id) {
          const [{ data: submissionData, error: submissionError }, { data: totnData, error: totnError }] =
            await Promise.all([
              supabase
                .from("submissions")
                .select("*")
                .eq("auth_user_id", user.id)
                .eq("show_id", nextSnapshot.show_id)
                .order("created_at", { ascending: true })
                .limit(1),
              supabase.rpc("get_totn_board_for_active_show"),
            ]);

          if (!isMounted) {
            return;
          }

          if (submissionError) {
            setErrorMessage(submissionError.message);
            return;
          }

          if (totnError) {
            setErrorMessage(totnError.message);
            return;
          }

          setSubmission(submissionData?.[0] ?? null);
          setNominations(totnData ?? []);
        } else {
          setSubmission(null);
          setNominations([]);
        }

        setErrorMessage(null);
      } catch (error) {
        if (isMounted) {
          setErrorMessage(
            error instanceof Error
              ? error.message
              : "Could not load your live dashboard status.",
          );
        }
      } finally {
        if (isMounted) {
          setIsLoading(false);
        }
      }
    }

    loadDashboardStatus();

    return () => {
      isMounted = false;
    };
  }, [user]);

  const userNomination = nominations.find(
    (nomination) => nomination.submission_id === submission?.id,
  );
  const currentVote = nominations.find((nomination) => nomination.has_user_vote);

  function handleVote(nominationId: string) {
    startTransition(async () => {
      try {
        const supabase = getSupabaseBrowserClient();
        const { error } = await supabase.rpc("cast_totn_vote", {
          p_nomination_id: nominationId,
        });

        if (error) {
          setVoteMessage({
            tone: "error",
            text: error.message,
          });
          return;
        }

        setNominations((current) =>
          current.map((nomination) => ({
            ...nomination,
            votes:
              nomination.nomination_id === nominationId
                ? nomination.votes + (nomination.has_user_vote ? 0 : 1)
                : nomination.has_user_vote
                  ? Math.max(nomination.votes - 1, 0)
                  : nomination.votes,
            has_user_vote: nomination.nomination_id === nominationId,
          })),
        );
        setVoteMessage({
          tone: "success",
          text: "Your TOTN vote has been saved.",
        });
      } catch (error) {
        setVoteMessage({
          tone: "error",
          text:
            error instanceof Error ? error.message : "Could not save your vote.",
        });
      }
    });
  }

  return (
    <SectionCard
      title="Your Checklist"
      description="A tighter live status area for your submission and this week's TOTN vote."
    >
      {errorMessage ? (
        <div className="mb-4 rounded-[22px] border border-rose-400/30 bg-rose-400/10 p-4 text-sm leading-6 text-rose-100">
          {errorMessage}
        </div>
      ) : null}

      <div className="space-y-4">
        <div className="rounded-[22px] border border-fuchsia-500/15 bg-[linear-gradient(180deg,rgba(16,11,31,0.88),rgba(8,7,18,0.74))] p-4">
          <div className="flex items-center justify-between gap-3">
            <p className="font-semibold text-white">Submission Status</p>
            <StatusPill tone={statusTone(submission)}>
              {formatSubmissionStatus(submission)}
            </StatusPill>
          </div>
          {submission ? (
            <div className="mt-3 flex items-start gap-3">
              <UserAvatar
                imageUrl={profile?.avatarUrl ?? null}
                name={submission.artist_name}
                className="h-12 w-12"
                textClassName="text-xs"
              />
              <div className="min-w-0">
                <p className="break-words text-sm leading-6 text-zinc-300">
                  {submission.artist_name} - {submission.track_title}
                </p>
                <p className="mt-1 text-sm leading-6 text-zinc-500">
                  {submission.genre || "Genre not set"}
                </p>
              </div>
            </div>
          ) : (
            <p className="mt-3 text-sm leading-6 text-zinc-300">
              {isLoading
                ? "Checking your current show submission..."
                : snapshot.show_id
                  ? "No track submitted for this show."
                  : "No upcoming show."}
            </p>
          )}
          {submission ? (
            <p className="mt-2 text-sm leading-6 text-zinc-400">
              {submission.moderation_status === "pending_review"
                ? "This submission is waiting for moderation review before it can appear publicly."
                : submission.moderation_status === "rejected"
                ? "This submission was rejected by moderation."
                : submission.moderation_status === "removed"
                  ? "This submission was removed by moderation."
                  : userNomination
                ? "Your current show track has been nominated for TOTN."
                : "Your track is not nominated for TOTN."}
            </p>
          ) : null}
        </div>

        <div className="rounded-[22px] border border-fuchsia-500/15 bg-[linear-gradient(180deg,rgba(16,11,31,0.88),rgba(8,7,18,0.74))] p-4">
          <div className="flex items-center justify-between gap-3">
            <p className="font-semibold text-white">This Week&apos;s TOTN Vote</p>
            <StatusPill tone={currentVote ? "accent" : "neutral"}>
              {currentVote ? "Vote Cast" : "Open"}
            </StatusPill>
          </div>

          {voteMessage ? (
            <div
              className={`mt-3 rounded-2xl border px-4 py-3 text-sm leading-6 ${
                voteMessage.tone === "success"
                  ? "border-emerald-400/30 bg-emerald-400/10 text-emerald-100"
                  : "border-rose-400/30 bg-rose-400/10 text-rose-100"
              }`}
            >
              {voteMessage.text}
            </div>
          ) : null}

          {isLoading ? (
            <p className="mt-3 text-sm leading-6 text-zinc-300">
              Loading this week&apos;s TOTN board...
            </p>
          ) : nominations.length > 0 ? (
            <div className="mt-3 space-y-3">
              {nominations.map((nomination) => (
                <div
                  key={nomination.nomination_id}
                  className="rounded-[18px] border border-cyan-500/15 bg-[linear-gradient(180deg,rgba(11,11,27,0.92),rgba(7,9,20,0.82))] p-3"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <p className="font-semibold text-white">
                        {nomination.artist_name} - {nomination.track_title}
                      </p>
                      <p className="mt-1 text-sm text-zinc-400">
                        {nomination.votes} vote{nomination.votes === 1 ? "" : "s"}
                      </p>
                    </div>
                    <button
                      type="button"
                      disabled={isPending}
                      onClick={() => handleVote(nomination.nomination_id)}
                      className={`min-h-10 rounded-2xl px-4 py-2 text-xs font-bold uppercase tracking-[0.12em] transition ${
                        nomination.has_user_vote
                          ? "border border-fuchsia-400/30 bg-fuchsia-500/10 text-fuchsia-100"
                          : "bg-[linear-gradient(90deg,var(--brand-start),var(--brand-mid),var(--brand-end))] text-white hover:brightness-110"
                      }`}
                    >
                      {nomination.has_user_vote ? "Voted" : "Vote"}
                    </button>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <p className="mt-3 text-sm leading-6 text-zinc-300">
              No nominations yet.
            </p>
          )}
        </div>
      </div>
    </SectionCard>
  );
}
