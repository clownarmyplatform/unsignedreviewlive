"use client";

import { useEffect, useState } from "react";
import { getSupabaseBrowserClient } from "@/lib/supabase/client";
import type { Database } from "@/lib/supabase/types";
import { StatusPill } from "@/components/ui/status-pill";
import { UserAvatar } from "@/components/ui/user-avatar";

type QueueRow =
  Database["public"]["Functions"]["get_show_queue_for_active_show"]["Returns"][number];

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

export function ShowQueueBoard() {
  const [queue, setQueue] = useState<QueueRow[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  useEffect(() => {
    let isMounted = true;

    async function loadQueue() {
      try {
        const supabase = getSupabaseBrowserClient();
        const { data, error } = await supabase.rpc("get_show_queue_for_active_show");

        if (!isMounted) {
          return;
        }

        if (error) {
          setErrorMessage(error.message);
          return;
        }

        setQueue(data ?? []);
      } catch (error) {
        if (isMounted) {
          setErrorMessage(
            error instanceof Error ? error.message : "Could not load the live queue.",
          );
        }
      } finally {
        if (isMounted) {
          setIsLoading(false);
        }
      }
    }

    function refreshQueue() {
      void loadQueue();
    }

    loadQueue();
    window.addEventListener("submission-played", refreshQueue);
    window.addEventListener("admin-show-created", refreshQueue);

    return () => {
      isMounted = false;
      window.removeEventListener("submission-played", refreshQueue);
      window.removeEventListener("admin-show-created", refreshQueue);
    };
  }, []);

  if (isLoading) {
    return (
      <div className="rounded-[24px] border border-fuchsia-500/15 bg-[linear-gradient(180deg,rgba(16,11,31,0.88),rgba(8,7,18,0.74))] p-5 text-sm leading-7 text-zinc-300">
        Loading the live show queue...
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

  if (queue.length === 0) {
    return (
      <div className="rounded-[24px] border border-dashed border-white/10 bg-white/[0.03] p-5 text-sm leading-7 text-zinc-300">
        No tracks in the queue yet.
      </div>
    );
  }

  const showTitle = queue[0]?.show_title ?? "Upcoming Show";
  const showDate = queue[0]?.show_date
    ? new Date(queue[0].show_date).toLocaleString()
    : "Start time not set";

  return (
    <div className="space-y-4">
      <div className="rounded-[24px] border border-fuchsia-500/15 bg-[linear-gradient(180deg,rgba(16,11,31,0.88),rgba(8,7,18,0.74))] p-5">
        <p className="text-sm uppercase tracking-[0.3em] text-zinc-500">Active Show</p>
        <p className="mt-2 text-2xl font-semibold text-white">{showTitle}</p>
        <p className="mt-2 text-sm leading-6 text-zinc-300">{showDate}</p>
      </div>

      <div className="max-h-[29rem] overflow-y-auto rounded-[24px] border border-cyan-500/15 bg-[linear-gradient(180deg,rgba(11,11,27,0.92),rgba(7,9,20,0.82))] p-3 scrollbar-thin scrollbar-track-transparent scrollbar-thumb-white/10 hover:scrollbar-thumb-white/15 sm:p-4">
        <div className="grid gap-4">
          {queue.map((item, index) => (
            <article
              key={item.submission_id}
              className="rounded-[24px] border border-fuchsia-500/15 bg-[linear-gradient(180deg,rgba(16,11,31,0.88),rgba(8,7,18,0.74))] p-5"
            >
              <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
                <div className="flex items-start gap-3">
                  <UserAvatar
                    imageUrl={item.avatar_url}
                    name={item.artist_name}
                    className="h-12 w-12"
                    textClassName="text-xs"
                  />
                  <div>
                    <p className="text-sm uppercase tracking-[0.3em] text-zinc-500">
                      Slot {index + 1}
                    </p>
                    <p className="mt-2 text-xl font-semibold text-white">
                      {item.artist_name} - {item.track_title}
                    </p>
                    <p className="mt-2 text-sm leading-6 text-zinc-400">
                      {item.genre} | Submitted {new Date(item.created_at).toLocaleString()}
                    </p>
                  </div>
                </div>
                <StatusPill tone={queueStatusTone(item.status)}>
                  {formatQueueStatus(item.status)}
                </StatusPill>
              </div>
            </article>
          ))}
        </div>
      </div>
    </div>
  );
}
