"use client";

import { useEffect, useState, useTransition } from "react";
import { getSupabaseBrowserClient } from "@/lib/supabase/client";
import { getEmbeddedMedia } from "@/lib/media-embed";
import type { Database } from "@/lib/supabase/types";
import { StatusPill } from "@/components/ui/status-pill";
import { UserAvatar } from "@/components/ui/user-avatar";

type StudioTrack =
  Database["public"]["Functions"]["get_show_queue_for_active_show"]["Returns"][number];

type ActiveTrackPreview = {
  artistName: string;
  nominationMessage: string | null;
  submissionId: string;
  trackTitle: string;
  embedUrl: string;
  originalUrl: string;
  externalLabel: string;
};

function formatStudioStatus(status: string, isPlayingNow: boolean) {
  if (isPlayingNow) {
    return "Playing Now";
  }

  if (status === "pending" || status === "queued") {
    return "Queued";
  }

  if (status === "played") {
    return "Played";
  }

  if (status === "reviewed") {
    return "Reviewed";
  }

  return status;
}

function studioStatusTone(status: string, isPlayingNow: boolean) {
  if (isPlayingNow) {
    return "accent";
  }

  if (status === "pending" || status === "queued") {
    return "warning";
  }

  if (status === "played" || status === "reviewed") {
    return "success";
  }

  return "neutral";
}

export function AdminUnplayedTracksBoard() {
  const [tracks, setTracks] = useState<StudioTrack[]>([]);
  const [activeTrack, setActiveTrack] = useState<ActiveTrackPreview | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();
  const [isNominating, startNominationTransition] = useTransition();
  const [isReviewPending, startReviewTransition] = useTransition();

  useEffect(() => {
    let isMounted = true;

    async function loadTracks() {
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

        setTracks(data ?? []);
      } catch (error) {
        if (isMounted) {
          setErrorMessage(
            error instanceof Error ? error.message : "Could not load unplayed tracks.",
          );
        }
      } finally {
        if (isMounted) {
          setIsLoading(false);
        }
      }
    }

    loadTracks();
    window.addEventListener("submission-played", loadTracks);
    window.addEventListener("admin-show-created", loadTracks);

    return () => {
      isMounted = false;
      window.removeEventListener("submission-played", loadTracks);
      window.removeEventListener("admin-show-created", loadTracks);
    };
  }, []);

  function openTrack(track: StudioTrack) {
    const embeddedMedia = getEmbeddedMedia(track.track_url);

    if (embeddedMedia) {
      setActiveTrack({
        artistName: track.artist_name,
        nominationMessage: null,
        submissionId: track.submission_id,
        trackTitle: track.track_title,
        embedUrl: embeddedMedia.embedUrl,
        originalUrl: track.track_url,
        externalLabel: embeddedMedia.externalLabel,
      });
    } else {
      window.open(track.track_url, "_blank", "noopener,noreferrer");
    }
  }

  function handlePlayNow(track: StudioTrack) {
    startTransition(async () => {
      try {
        const supabase = getSupabaseBrowserClient();
        const { error } = await supabase.rpc("mark_submission_played", {
          p_submission_id: track.submission_id,
        });

        if (error) {
          setErrorMessage(error.message);
          return;
        }

        setTracks((current) =>
          current.map((item) =>
            item.submission_id === track.submission_id
              ? {
                  ...item,
                  status: "played",
                }
              : item,
          ),
        );
        openTrack(track);

        window.dispatchEvent(
          new CustomEvent("submission-played", {
            detail: {
              show_id: track.show_id,
            },
          }),
        );
      } catch (error) {
        setErrorMessage(
          error instanceof Error ? error.message : "Could not mark track as played.",
        );
      }
    });
  }

  function handleMarkReviewed(submissionId: string) {
    startReviewTransition(async () => {
      try {
        const supabase = getSupabaseBrowserClient();
        const { error } = await supabase.rpc("mark_submission_reviewed", {
          p_submission_id: submissionId,
        });

        if (error) {
          setErrorMessage(error.message);
          return;
        }

        setTracks((current) =>
          current.map((item) =>
            item.submission_id === submissionId
              ? {
                  ...item,
                  status: "reviewed",
                }
              : item,
          ),
        );
      } catch (error) {
        setErrorMessage(
          error instanceof Error ? error.message : "Could not mark track as reviewed.",
        );
      }
    });
  }

  function handleNominateForTotn() {
    if (!activeTrack) {
      return;
    }

    startNominationTransition(async () => {
      try {
        const supabase = getSupabaseBrowserClient();
        const { error } = await supabase.rpc("nominate_submission_for_totn", {
          p_submission_id: activeTrack.submissionId,
        });

        if (error) {
          setActiveTrack((current) =>
            current
              ? {
                  ...current,
                  nominationMessage: error.message,
                }
              : current,
          );
          return;
        }

        setActiveTrack((current) =>
          current
            ? {
                ...current,
                nominationMessage: "Track nominated for TOTN.",
              }
            : current,
        );
        window.dispatchEvent(
          new CustomEvent("totn-nominated", {
            detail: {
              submission_id: activeTrack.submissionId,
            },
          }),
        );
      } catch (error) {
        setActiveTrack((current) =>
          current
            ? {
                ...current,
                nominationMessage:
                  error instanceof Error
                    ? error.message
                    : "Could not nominate this track for TOTN.",
              }
            : current,
        );
      }
    });
  }

  const showTitle = tracks[0]?.show_title ?? "The Acid Clowns Studio";
  const showDate = tracks[0]?.show_date
    ? new Date(tracks[0].show_date).toLocaleString()
    : "Start time not set";

  return (
    <div className="space-y-6">
      {errorMessage ? (
        <div className="rounded-2xl border border-rose-400/30 bg-rose-400/10 px-4 py-3 text-sm text-rose-100">
          {errorMessage}
        </div>
      ) : null}

      {isLoading ? (
        <div className="rounded-[24px] border border-white/10 bg-white/[0.03] p-5 text-sm text-zinc-300">
          Loading studio queue...
        </div>
      ) : (
        <>
          {tracks.length > 0 ? (
            <div className="space-y-4">
              <div className="rounded-[24px] border border-white/10 bg-white/[0.03] p-5">
                <p className="text-sm uppercase tracking-[0.3em] text-zinc-500">
                  Studio Queue
                </p>
                <p className="mt-2 text-2xl font-semibold text-white">{showTitle}</p>
                <p className="mt-2 text-sm leading-6 text-zinc-300">{showDate}</p>
              </div>

              <div className="grid gap-4">
                {tracks.map((track, index) => {
                  const isPlayingNow = activeTrack?.submissionId === track.submission_id;

                  return (
                    <article
                      key={track.submission_id}
                      className="rounded-[24px] border border-white/10 bg-white/[0.03] p-5"
                    >
                      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
                        <div className="flex items-start gap-3">
                          <UserAvatar
                            imageUrl={track.avatar_url}
                            name={track.artist_name}
                            className="h-12 w-12"
                            textClassName="text-xs"
                          />
                          <div>
                            <p className="text-sm uppercase tracking-[0.3em] text-zinc-500">
                              Slot {index + 1}
                            </p>
                            <p className="mt-2 text-xl font-semibold text-white">
                              {track.artist_name} - {track.track_title}
                            </p>
                            <p className="mt-2 text-sm leading-6 text-zinc-400">
                              {track.genre} | Submitted{" "}
                              {new Date(track.created_at).toLocaleString()}
                            </p>
                            {track.message ? (
                              <p className="mt-3 text-sm leading-6 text-zinc-300">
                                {track.message}
                              </p>
                            ) : null}
                          </div>
                        </div>

                        <div className="flex flex-col items-start gap-3 sm:items-end">
                          <StatusPill tone={studioStatusTone(track.status, isPlayingNow)}>
                            {formatStudioStatus(track.status, isPlayingNow)}
                          </StatusPill>

                          <div className="flex flex-wrap gap-3 sm:justify-end">
                            <button
                              type="button"
                              disabled={isPending}
                              onClick={() =>
                                track.status === "pending" || track.status === "queued"
                                  ? handlePlayNow(track)
                                  : openTrack(track)
                              }
                              className="min-h-12 rounded-2xl bg-amber-300 px-5 py-3 text-sm font-bold uppercase tracking-[0.12em] text-black transition hover:bg-amber-200 disabled:cursor-not-allowed disabled:opacity-70"
                            >
                              {isPending && isPlayingNow
                                ? "Opening..."
                                : track.status === "pending" || track.status === "queued"
                                  ? "Play Now"
                                  : "Open Again"}
                            </button>

                            {track.status === "played" ? (
                              <button
                                type="button"
                                disabled={isReviewPending}
                                onClick={() => handleMarkReviewed(track.submission_id)}
                                className="min-h-12 rounded-2xl border border-white/10 bg-white/5 px-5 py-3 text-sm font-bold uppercase tracking-[0.12em] text-white transition hover:bg-white/10 disabled:cursor-not-allowed disabled:opacity-70"
                              >
                                {isReviewPending ? "Saving..." : "Mark Reviewed"}
                              </button>
                            ) : null}
                          </div>
                        </div>
                      </div>
                    </article>
                  );
                })}
              </div>
            </div>
          ) : (
            <div className="rounded-[24px] border border-dashed border-white/10 bg-white/[0.03] p-5 text-sm leading-7 text-zinc-300">
              No studio tracks are waiting for the current show right now.
            </div>
          )}
        </>
      )}

      {activeTrack ? (
        <div className="fixed inset-0 z-40 bg-black/80 p-3 backdrop-blur-sm sm:p-6">
          <div className="mx-auto flex h-full w-full max-w-6xl flex-col overflow-hidden rounded-[28px] border border-white/10 bg-[#090b10] shadow-2xl shadow-black/50">
            <div className="flex flex-col gap-3 border-b border-white/10 px-4 py-3 md:flex-row md:items-center md:justify-between">
              <div>
                <p className="text-sm uppercase tracking-[0.3em] text-zinc-500">
                  Now Playing
                </p>
                <p className="mt-1 text-lg font-semibold text-white">
                  {activeTrack.artistName} - {activeTrack.trackTitle}
                </p>
              </div>
              <div className="flex flex-wrap items-center gap-3">
                <button
                  type="button"
                  onClick={handleNominateForTotn}
                  disabled={isNominating}
                  className="rounded-2xl bg-amber-300 px-4 py-2 text-sm font-semibold text-black transition hover:bg-amber-200 disabled:cursor-not-allowed disabled:opacity-70"
                >
                  {isNominating ? "Nominating..." : "Nominate For TOTN"}
                </button>
                <a
                  href={activeTrack.originalUrl}
                  target="_blank"
                  rel="noreferrer"
                  className="rounded-2xl border border-white/10 bg-white/5 px-4 py-2 text-sm font-semibold text-white transition hover:bg-white/10"
                >
                  {activeTrack.externalLabel}
                </a>
                <button
                  type="button"
                  onClick={() => setActiveTrack(null)}
                  className="rounded-2xl border border-white/10 bg-white/5 px-4 py-2 text-sm font-semibold text-white transition hover:bg-white/10"
                >
                  Close
                </button>
              </div>
            </div>
            {activeTrack.nominationMessage ? (
              <div className="border-b border-white/10 px-4 py-3 text-sm text-amber-100">
                {activeTrack.nominationMessage}
              </div>
            ) : null}
            <iframe
              title={`${activeTrack.artistName} ${activeTrack.trackTitle}`}
              src={activeTrack.embedUrl}
              className="h-full w-full flex-1 bg-black"
              allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
              allowFullScreen
              referrerPolicy="strict-origin-when-cross-origin"
            />
          </div>
        </div>
      ) : null}
    </div>
  );
}
