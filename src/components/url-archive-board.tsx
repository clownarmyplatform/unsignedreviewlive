"use client";

import Link from "next/link";
import { useEffect, useEffectEvent, useState } from "react";
import { StatusPill } from "@/components/ui/status-pill";
import { UserAvatar } from "@/components/ui/user-avatar";
import { getSupabaseBrowserClient } from "@/lib/supabase/client";
import type { Database } from "@/lib/supabase/types";

type ArchiveShow =
  Database["public"]["Functions"]["get_url_archive_shows"]["Returns"][number];
type ArchiveTrack =
  Database["public"]["Functions"]["get_url_archive_show_tracks"]["Returns"][number];

function formatTrackStatus(status: string) {
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

function statusTone(status: string) {
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

export function UrlArchiveBoard() {
  const [shows, setShows] = useState<ArchiveShow[]>([]);
  const [tracksByShow, setTracksByShow] = useState<Record<string, ArchiveTrack[]>>({});
  const [loadingShowId, setLoadingShowId] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  useEffect(() => {
    let isMounted = true;

    async function loadArchive() {
      try {
        const supabase = getSupabaseBrowserClient();
        const { data, error } = await supabase.rpc("get_url_archive_shows");

        if (!isMounted) {
          return;
        }

        if (error) {
          setErrorMessage(error.message);
          return;
        }

        setShows(data ?? []);
      } catch (error) {
        if (isMounted) {
          setErrorMessage(
            error instanceof Error ? error.message : "Could not load the URL archive.",
          );
        }
      } finally {
        if (isMounted) {
          setIsLoading(false);
        }
      }
    }

    loadArchive();

    return () => {
      isMounted = false;
    };
  }, []);

  async function loadShowTracks(showId: string) {
    if (tracksByShow[showId] || loadingShowId === showId) {
      return;
    }

    setLoadingShowId(showId);

    try {
      const supabase = getSupabaseBrowserClient();
      const { data, error } = await supabase.rpc("get_url_archive_show_tracks", {
        p_show_id: showId,
      });

      if (error) {
        setErrorMessage(error.message);
        return;
      }

      setTracksByShow((current) => ({
        ...current,
        [showId]: data ?? [],
      }));
    } catch (error) {
      setErrorMessage(
        error instanceof Error ? error.message : "Could not load archived track list.",
      );
    } finally {
      setLoadingShowId((current) => (current === showId ? null : current));
    }
  }

  const revealHashTarget = useEffectEvent(() => {
    const targetId = window.location.hash.replace("#", "");

    if (!targetId.startsWith("archive-show-")) {
      return;
    }

    const showId = targetId.replace("archive-show-", "");
    const targetElement = document.getElementById(targetId);

    if (!(targetElement instanceof HTMLDetailsElement)) {
      return;
    }

    if (!targetElement.open) {
      targetElement.open = true;
    }

    void loadShowTracks(showId);
    targetElement.scrollIntoView({ behavior: "smooth", block: "start" });
  });

  useEffect(() => {
    if (typeof window === "undefined" || shows.length === 0) {
      return;
    }

    window.setTimeout(revealHashTarget, 0);
    window.addEventListener("hashchange", revealHashTarget);

    return () => {
      window.removeEventListener("hashchange", revealHashTarget);
    };
  }, [shows]);

  if (isLoading) {
    return (
      <div className="rounded-[24px] border border-fuchsia-500/15 bg-[linear-gradient(180deg,rgba(16,11,31,0.88),rgba(8,7,18,0.74))] p-5 text-sm leading-7 text-zinc-300">
        Loading archived shows...
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

  if (shows.length === 0) {
    return (
      <div className="rounded-[24px] border border-dashed border-white/10 bg-white/[0.03] p-5 text-sm leading-7 text-zinc-300">
        No archived shows yet.
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {shows.map((show) => (
        <details
          key={show.show_id}
          id={`archive-show-${show.show_id}`}
          onToggle={(event) => {
            const element = event.currentTarget;
            if (element.open) {
              void loadShowTracks(show.show_id);
            }
          }}
          className="scroll-mt-28 rounded-[24px] border border-fuchsia-500/15 bg-[linear-gradient(180deg,rgba(16,11,31,0.88),rgba(8,7,18,0.74))] p-5"
        >
          <summary className="list-none cursor-pointer">
            <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
              <div>
                <div className="flex flex-wrap gap-2">
                  <StatusPill tone="neutral">Archived Show</StatusPill>
                  <StatusPill tone={show.winner_submission_id ? "accent" : "neutral"}>
                    {show.winner_submission_id ? "TOTN Winner Set" : "No TOTN winner"}
                  </StatusPill>
                </div>
                <p className="mt-3 text-3xl font-semibold text-white">{show.show_title}</p>
                <p className="mt-2 text-sm leading-6 text-zinc-300">
                  {new Date(show.show_date).toLocaleString()} to{" "}
                  {new Date(show.ends_at).toLocaleString()}
                </p>
                <p className="mt-2 text-sm leading-6 text-zinc-400">
                  Theme: {show.theme || "TBC"} | {show.submission_count} tracks |{" "}
                  {show.nomination_count} TOTN nominations
                </p>
              </div>
              <span className="text-sm uppercase tracking-[0.2em] text-zinc-500">
                Expand
              </span>
            </div>
          </summary>

          <div className="mt-5 space-y-4">
            <div className="grid gap-4 lg:grid-cols-[1fr_1fr]">
              <div className="rounded-[22px] border border-cyan-500/15 bg-[linear-gradient(180deg,rgba(11,11,27,0.92),rgba(7,9,20,0.82))] p-4">
                <p className="text-sm uppercase tracking-[0.3em] text-zinc-500">
                  TOTN Winner
                </p>
                <p className="mt-2 text-xl font-semibold text-white">
                  {show.winner_submission_id
                    ? `${show.winner_artist_name} - ${show.winner_track_title}`
                    : "No winner"}
                </p>
                <p className="mt-2 text-sm leading-6 text-zinc-300">
                  {show.winner_submission_id
                    ? `${show.winner_votes ?? 0} vote${show.winner_votes === 1 ? "" : "s"}`
                    : "No result recorded."}
                </p>
              </div>

              <div className="rounded-[22px] border border-cyan-500/15 bg-[linear-gradient(180deg,rgba(11,11,27,0.92),rgba(7,9,20,0.82))] p-4">
                <p className="text-sm uppercase tracking-[0.3em] text-zinc-500">
                  Show Links
                </p>
                <p className="mt-2 text-sm leading-6 text-zinc-300">
                  Venue: {show.venue || "No link saved"}
                </p>
                {show.venue ? (
                  <div className="mt-4">
                    <Link
                      href={`/show/live?src=${encodeURIComponent(show.venue)}&title=${encodeURIComponent(show.show_title)}`}
                      className="inline-flex min-h-12 items-center justify-center rounded-2xl bg-[linear-gradient(90deg,var(--brand-start),var(--brand-mid),var(--brand-end))] px-5 py-3 text-sm font-bold uppercase tracking-[0.12em] text-white transition hover:brightness-110"
                    >
                      View Previous Show
                    </Link>
                  </div>
                ) : null}
              </div>
            </div>

            <div className="rounded-[22px] border border-cyan-500/15 bg-[linear-gradient(180deg,rgba(11,11,27,0.92),rgba(7,9,20,0.82))] p-4">
              <p className="text-sm uppercase tracking-[0.3em] text-zinc-500">
                Track List
              </p>
              {loadingShowId === show.show_id ? (
                <p className="mt-3 text-sm leading-6 text-zinc-300">
                  Loading archived track list...
                </p>
              ) : tracksByShow[show.show_id]?.length ? (
                <div className="mt-4 space-y-3">
                  {tracksByShow[show.show_id].map((track, index) => (
                    <div
                      key={track.submission_id}
                      className="rounded-[18px] border border-fuchsia-500/15 bg-[linear-gradient(180deg,rgba(16,11,31,0.88),rgba(8,7,18,0.74))] p-4"
                    >
                      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                        <div className="flex items-start gap-3">
                          <UserAvatar
                            imageUrl={track.avatar_url}
                            name={track.artist_name}
                            className="h-11 w-11"
                            textClassName="text-xs"
                          />
                          <div>
                            <p className="text-sm uppercase tracking-[0.24em] text-zinc-500">
                              Slot {index + 1}
                            </p>
                            <p className="mt-2 font-semibold text-white">
                              {track.artist_name} - {track.track_title}
                            </p>
                            <p className="mt-1 text-sm leading-6 text-zinc-400">
                              {track.genre} | {new Date(track.created_at).toLocaleString()}
                            </p>
                          </div>
                        </div>
                        <div className="flex flex-wrap gap-2">
                          <StatusPill tone={statusTone(track.status)}>
                            {formatTrackStatus(track.status)}
                          </StatusPill>
                          {track.is_totn_nominated ? (
                            <StatusPill tone={track.is_totn_winner ? "accent" : "neutral"}>
                              {track.is_totn_winner
                                ? `TOTN Winner (${track.nomination_votes} votes)`
                                : `TOTN Nominated (${track.nomination_votes} votes)`}
                            </StatusPill>
                          ) : null}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="mt-3 text-sm leading-6 text-zinc-300">
                  No tracks saved for this show.
                </p>
              )}
            </div>
          </div>
        </details>
      ))}
    </div>
  );
}
