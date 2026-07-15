"use client";

import { useEffect, useState, useTransition } from "react";
import { getSupabaseBrowserClient } from "@/lib/supabase/client";
import type { Database } from "@/lib/supabase/types";
import { StatusPill } from "@/components/ui/status-pill";

type TotnBoardRow =
  Database["public"]["Functions"]["get_totn_board_for_active_show"]["Returns"][number];

export function TotnLiveBoard() {
  const [nominations, setNominations] = useState<TotnBoardRow[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [voteMessage, setVoteMessage] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  useEffect(() => {
    let isMounted = true;

    async function loadBoard() {
      try {
        const supabase = getSupabaseBrowserClient();
        const { data, error } = await supabase.rpc("get_totn_board_for_active_show");

        if (!isMounted) {
          return;
        }

        if (error) {
          setErrorMessage(error.message);
          return;
        }

        setNominations(data ?? []);
        setErrorMessage(null);
        setVoteMessage(null);
      } catch (error) {
        if (isMounted) {
          setErrorMessage(
            error instanceof Error ? error.message : "Could not load TOTN nominations.",
          );
        }
      } finally {
        if (isMounted) {
          setIsLoading(false);
        }
      }
    }

    function refreshBoard() {
      void loadBoard();
    }

    void loadBoard();
    window.addEventListener("totn-nominated", refreshBoard);
    window.addEventListener("submission-played", refreshBoard);
    window.addEventListener("admin-show-created", refreshBoard);

    return () => {
      isMounted = false;
      window.removeEventListener("totn-nominated", refreshBoard);
      window.removeEventListener("submission-played", refreshBoard);
      window.removeEventListener("admin-show-created", refreshBoard);
    };
  }, []);

  function handleVote(nominationId: string) {
    startTransition(async () => {
      try {
        const supabase = getSupabaseBrowserClient();
        const { error } = await supabase.rpc("cast_totn_vote", {
          p_nomination_id: nominationId,
        });

        if (error) {
          setVoteMessage(error.message);
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
        setVoteMessage("Your TOTN vote has been saved.");
      } catch (error) {
        setVoteMessage(
          error instanceof Error ? error.message : "Could not save your TOTN vote.",
        );
      }
    });
  }

  if (isLoading) {
    return (
      <div className="rounded-[24px] border border-fuchsia-500/15 bg-[linear-gradient(180deg,rgba(16,11,31,0.88),rgba(8,7,18,0.74))] p-5 text-sm leading-7 text-zinc-300">
        Loading TOTN nominations...
      </div>
    );
  }

  if (errorMessage) {
    return (
      <div className="rounded-[24px] border border-rose-400/30 bg-rose-400/10 p-5 text-sm leading-7 text-rose-100">
        {errorMessage}
      </div>
    );
  }

  if (nominations.length === 0) {
    return (
      <div className="rounded-[24px] border border-dashed border-white/10 bg-white/[0.03] p-5 text-sm leading-7 text-zinc-300">
        <div className="flex items-center gap-3">
          <StatusPill tone="neutral">Voting closed or no nominations yet</StatusPill>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {voteMessage ? (
        <div className="rounded-2xl border border-emerald-400/30 bg-emerald-400/10 px-4 py-3 text-sm text-emerald-100">
          {voteMessage}
        </div>
      ) : null}

      {nominations.map((nomination, index) => (
        <article
          key={nomination.nomination_id}
          className="rounded-[24px] border border-fuchsia-500/15 bg-[linear-gradient(180deg,rgba(16,11,31,0.88),rgba(8,7,18,0.74))] p-5"
        >
          <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
            <div>
              <p className="text-sm uppercase tracking-[0.3em] text-zinc-500">
                Nomination {index + 1}
              </p>
              <p className="mt-2 text-xl font-semibold text-white">
                {nomination.artist_name} - {nomination.track_title}
              </p>
              <p className="mt-2 text-sm leading-6 text-zinc-400">
                {nomination.votes} vote{nomination.votes === 1 ? "" : "s"}
              </p>
            </div>

            <div className="flex flex-col items-start gap-3 sm:items-end">
              <StatusPill tone={nomination.has_user_vote ? "accent" : "neutral"}>
                {nomination.has_user_vote ? "Voted" : "Open"}
              </StatusPill>

              <button
                type="button"
                disabled={isPending}
                onClick={() => handleVote(nomination.nomination_id)}
                className={`min-h-12 rounded-2xl px-5 py-3 text-sm font-bold uppercase tracking-[0.12em] transition ${
                  nomination.has_user_vote
                    ? "border border-fuchsia-400/30 bg-fuchsia-500/10 text-fuchsia-100"
                    : "bg-[linear-gradient(90deg,var(--brand-start),var(--brand-mid),var(--brand-end))] text-white hover:brightness-110"
                }`}
              >
                {nomination.has_user_vote ? "Voted" : "Vote"}
              </button>
            </div>
          </div>
        </article>
      ))}
    </div>
  );
}
