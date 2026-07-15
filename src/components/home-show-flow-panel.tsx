"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { getSupabaseBrowserClient } from "@/lib/supabase/client";
import type { Database } from "@/lib/supabase/types";
import { StatusPill } from "@/components/ui/status-pill";

type QueueRow =
  Database["public"]["Functions"]["get_show_queue_for_active_show"]["Returns"][number];
type TotnBoardRow =
  Database["public"]["Functions"]["get_totn_board_for_active_show"]["Returns"][number];

function formatQueueStatus(status: string) {
  if (status === "pending") {
    return "Submitted";
  }

  if (status === "queued") {
    return "In Queue";
  }

  if (status === "played") {
    return "Played";
  }

  if (status === "reviewed") {
    return "Reviewed";
  }

  return status;
}

function queueStatusTone(status: string) {
  if (status === "pending") {
    return "warning";
  }

  if (status === "queued") {
    return "accent";
  }

  if (status === "played" || status === "reviewed") {
    return "success";
  }

  return "neutral";
}

export function HomeShowFlowPanel() {
  const [queue, setQueue] = useState<QueueRow[]>([]);
  const [nominations, setNominations] = useState<TotnBoardRow[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  useEffect(() => {
    let isMounted = true;

    async function loadShowFlow() {
      try {
        const supabase = getSupabaseBrowserClient();
        const [{ data: queueData, error: queueError }, { data: totnData, error: totnError }] =
          await Promise.all([
            supabase.rpc("get_show_queue_for_active_show"),
            supabase.rpc("get_totn_board_for_active_show"),
          ]);

        if (!isMounted) {
          return;
        }

        if (queueError) {
          setErrorMessage(queueError.message);
          return;
        }

        if (totnError) {
          setErrorMessage(totnError.message);
          return;
        }

        setQueue(queueData ?? []);
        setNominations(totnData ?? []);
        setErrorMessage(null);
      } catch (error) {
        if (isMounted) {
          setErrorMessage(
            error instanceof Error ? error.message : "Could not load show flow.",
          );
        }
      } finally {
        if (isMounted) {
          setIsLoading(false);
        }
      }
    }

    function refreshShowFlow() {
      void loadShowFlow();
    }

    void loadShowFlow();
    window.addEventListener("submission-played", refreshShowFlow);
    window.addEventListener("totn-nominated", refreshShowFlow);
    window.addEventListener("admin-show-created", refreshShowFlow);

    return () => {
      isMounted = false;
      window.removeEventListener("submission-played", refreshShowFlow);
      window.removeEventListener("totn-nominated", refreshShowFlow);
      window.removeEventListener("admin-show-created", refreshShowFlow);
    };
  }, []);

  if (isLoading) {
    return (
      <div className="rounded-[22px] border border-fuchsia-500/15 bg-[linear-gradient(180deg,rgba(16,11,31,0.88),rgba(8,7,18,0.74))] p-4 text-sm leading-6 text-zinc-300">
        Loading live show flow...
      </div>
    );
  }

  if (errorMessage) {
    return (
      <div className="rounded-[22px] border border-rose-400/30 bg-rose-400/10 p-4 text-sm leading-6 text-rose-100">
        {errorMessage}
      </div>
    );
  }

  const currentNomination = nominations[0] ?? null;
  const currentQueueItem = queue[0] ?? null;

  return (
    <div className="space-y-4">
      <Link
        href="/totn"
        className="block rounded-[22px] border border-fuchsia-500/15 bg-[linear-gradient(180deg,rgba(16,11,31,0.88),rgba(8,7,18,0.74))] p-4 transition hover:border-white/20 hover:bg-white/[0.05]"
      >
        <div className="flex items-start justify-between gap-3">
          <p className="text-sm uppercase tracking-[0.3em] text-zinc-500">TOTN</p>
          <StatusPill tone={nominations.length > 0 ? "accent" : "neutral"}>
            {nominations.length > 0 ? `${nominations.length} live` : "Waiting"}
          </StatusPill>
        </div>
        <p className="mt-2 text-xl font-semibold text-white">
          {currentNomination
            ? `${currentNomination.artist_name} - ${currentNomination.track_title}`
            : "No live nominations yet"}
        </p>
        <p className="mt-2 text-sm leading-6 text-zinc-400">
          {currentNomination
            ? `${currentNomination.votes} vote${currentNomination.votes === 1 ? "" : "s"} so far`
            : "Nominations will appear here once the host starts marking tracks for TOTN."}
        </p>
      </Link>

      <Link
        href="/queue"
        className="block rounded-[22px] border border-fuchsia-500/15 bg-[linear-gradient(180deg,rgba(16,11,31,0.88),rgba(8,7,18,0.74))] p-4 transition hover:border-white/20 hover:bg-white/[0.05]"
      >
        <div className="flex items-start justify-between gap-3">
          <p className="text-sm uppercase tracking-[0.3em] text-zinc-500">Queue</p>
          <StatusPill tone={currentQueueItem ? queueStatusTone(currentQueueItem.status) : "neutral"}>
            {currentQueueItem ? formatQueueStatus(currentQueueItem.status) : "Waiting"}
          </StatusPill>
        </div>
        <p className="mt-2 text-xl font-semibold text-white">
          {currentQueueItem
            ? `${currentQueueItem.artist_name} - ${currentQueueItem.track_title}`
            : "No live queue yet"}
        </p>
        <p className="mt-2 text-sm leading-6 text-zinc-400">
          {currentQueueItem
            ? `${queue.length} track${queue.length === 1 ? "" : "s"} in this show's queue`
            : "Queue activity will appear here once tracks are assigned to the active show."}
        </p>
      </Link>
    </div>
  );
}
