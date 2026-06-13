"use client";

import Link from "next/link";
import { useEffect, useState, useTransition } from "react";
import { PanelSearchInput } from "@/components/ui/panel-search-input";
import { StatCard } from "@/components/ui/stat-card";
import { useDebouncedValue } from "@/hooks/use-debounced-value";
import {
  GLOBAL_SEARCH_DEBOUNCE_MS,
  MIN_GLOBAL_SEARCH_QUERY_LENGTH,
} from "@/lib/global-search";
import { normalizeEmbeddableUrl } from "@/lib/media-embed";
import { getSupabaseBrowserClient } from "@/lib/supabase/client";
import type { Database } from "@/lib/supabase/types";

type AdminSnapshot =
  Database["public"]["Functions"]["get_admin_dashboard_snapshot"]["Returns"][number];
type ShowRow =
  Database["public"]["Functions"]["get_upcoming_shows_for_admin"]["Returns"][number];

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

function toDateInput(value: string | null) {
  if (!value) {
    return "";
  }

  const date = new Date(value);
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function toTimeInput(value: string | null) {
  if (!value) {
    return "";
  }

  const date = new Date(value);
  const hours = String(date.getHours()).padStart(2, "0");
  const minutes = String(date.getMinutes()).padStart(2, "0");
  return `${hours}:${minutes}`;
}

function toIsoString(date: string, time: string) {
  return new Date(`${date}T${time}:00`).toISOString();
}

export function AdminDashboardOverview({
  mode,
}: {
  mode: "stats" | "upcoming";
}) {
  const [snapshot, setSnapshot] = useState<AdminSnapshot>(emptySnapshot);
  const [upcomingShows, setUpcomingShows] = useState<ShowRow[]>([]);
  const [showSearchQuery, setShowSearchQuery] = useState("");
  const debouncedShowSearchQuery = useDebouncedValue(
    showSearchQuery,
    GLOBAL_SEARCH_DEBOUNCE_MS,
  );
  const [isSearchingShows, setIsSearchingShows] = useState(false);
  const [showsError, setShowsError] = useState<string | null>(null);
  const [hasLoaded, setHasLoaded] = useState(false);
  const [now, setNow] = useState(() => Date.now());
  const [editingShowId, setEditingShowId] = useState<string | null>(null);
  const [title, setTitle] = useState("");
  const [showDate, setShowDate] = useState("");
  const [startTime, setStartTime] = useState("");
  const [endTime, setEndTime] = useState("");
  const [theme, setTheme] = useState("");
  const [venue, setVenue] = useState("");
  const [editMessage, setEditMessage] = useState<string | null>(null);
  const [editError, setEditError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  function syncForm(show: {
    title: string | null;
    show_date: string | null;
    ends_at: string | null;
    theme: string | null;
    venue: string | null;
  }) {
    setTitle(show.title ?? "");
    setShowDate(toDateInput(show.show_date));
    setStartTime(toTimeInput(show.show_date));
    setEndTime(toTimeInput(show.ends_at));
    setTheme(show.theme ?? "");
    setVenue(show.venue ?? "");
  }

  function formatDateTime(value: string | null) {
    if (!value) {
      return "Not set";
    }

    return new Date(value).toLocaleString();
  }

  function formatShowCountdown(showDate: string | null) {
    if (!showDate) {
      return "TBC";
    }

    const difference = new Date(showDate).getTime() - now;

    if (difference <= 0) {
      return "Live now";
    }

    const totalSeconds = Math.floor(difference / 1000);
    const days = Math.floor(totalSeconds / 86400);
    const hours = Math.floor((totalSeconds % 86400) / 3600);
    const minutes = Math.floor((totalSeconds % 3600) / 60);
    const seconds = totalSeconds % 60;

    if (days > 0) {
      return `${days}d ${hours}h ${minutes}m`;
    }

    return `${hours}h ${minutes}m ${seconds}s`;
  }

  useEffect(() => {
    let isMounted = true;
    const timer = window.setInterval(() => {
      setNow(Date.now());
    }, 1000);

    async function loadSnapshot() {
      try {
        const supabase = getSupabaseBrowserClient();
        const { data } = await supabase.rpc("get_admin_dashboard_snapshot");

        if (isMounted && data?.[0]) {
          setSnapshot(data[0]);
        }
      } finally {
        if (isMounted) {
          setHasLoaded(true);
        }
      }
    }

    async function loadUpcomingShows() {
      try {
        setShowsError(null);
        const supabase = getSupabaseBrowserClient();
        const { data, error } = await supabase.rpc("get_upcoming_shows_for_admin");

        if (!isMounted) {
          return;
        }

        if (error) {
          setShowsError(error.message);
          return;
        }

        setUpcomingShows(data ?? []);
      } catch (error) {
        if (isMounted) {
          setShowsError(
            error instanceof Error ? error.message : "Could not load upcoming shows.",
          );
        }
      }
    }

    async function handleShowCreated() {
      await Promise.all([loadSnapshot(), loadUpcomingShows()]);
    }

    async function handleSubmissionPlayed() {
      await loadSnapshot();
    }

    async function handleNoticeboardUpdated() {
      await loadSnapshot();
    }

    void Promise.all([loadSnapshot(), loadUpcomingShows()]);
    window.addEventListener("admin-show-created", handleShowCreated);
    window.addEventListener("submission-played", handleSubmissionPlayed);
    window.addEventListener("noticeboard-updated", handleNoticeboardUpdated);

    return () => {
      isMounted = false;
      window.clearInterval(timer);
      window.removeEventListener("admin-show-created", handleShowCreated);
      window.removeEventListener("submission-played", handleSubmissionPlayed);
      window.removeEventListener("noticeboard-updated", handleNoticeboardUpdated);
    };
  }, []);

  useEffect(() => {
    let isMounted = true;

    async function loadShowsForQuery() {
      try {
        setShowsError(null);
        setIsSearchingShows(true);
        const supabase = getSupabaseBrowserClient();
        const trimmedQuery = debouncedShowSearchQuery.trim();
        const queryLength = trimmedQuery.length;
        const { data, error } =
          queryLength >= MIN_GLOBAL_SEARCH_QUERY_LENGTH
            ? await supabase.rpc("search_upcoming_shows_for_admin", {
                p_query: trimmedQuery,
              })
            : await supabase.rpc("get_upcoming_shows_for_admin");

        if (!isMounted) {
          return;
        }

        if (error) {
          setShowsError(error.message);
          return;
        }

        setUpcomingShows(data ?? []);
      } catch (error) {
        if (isMounted) {
          setShowsError(
            error instanceof Error ? error.message : "Could not load upcoming shows.",
          );
        }
      } finally {
        if (isMounted) {
          setIsSearchingShows(false);
        }
      }
    }

    if (!hasLoaded) {
      return;
    }

    if (debouncedShowSearchQuery.trim().length > 0 &&
      debouncedShowSearchQuery.trim().length < MIN_GLOBAL_SEARCH_QUERY_LENGTH) {
      return;
    }

    void loadShowsForQuery();

    return () => {
      isMounted = false;
    };
  }, [debouncedShowSearchQuery, hasLoaded]);

  if (mode === "stats") {
    const statCards = [
      {
        label: "Upcoming show",
        value: snapshot.show_title ?? "Create one",
        tone: snapshot.show_id ? "accent" : "warning",
        href: undefined,
        featured: false,
      },
      {
        label: "The Acid Clowns Studio",
        value: `Show Starts in: ${formatShowCountdown(snapshot.show_date)}`,
        tone: snapshot.unplayed_count > 0 ? "warning" : "neutral",
        href: "/admin/unplayed-tracks",
        featured: true,
      },
      {
        label: "TOTN nominations",
        value: `${snapshot.totn_count} active`,
        tone: snapshot.totn_count > 0 ? "accent" : "neutral",
        href: undefined,
        featured: false,
      },
      {
        label: "Noticeboard posts",
        value: `${snapshot.noticeboard_count} live`,
        tone: snapshot.noticeboard_count > 0 ? "neutral" : "warning",
        href: undefined,
        featured: false,
      },
      {
        label: "Places left",
        value: `${snapshot.places_left} remaining`,
        tone: snapshot.places_left > 0 ? "success" : "warning",
        href: undefined,
        featured: false,
      },
    ] as const;

    return (
      <div className="grid grid-cols-2 gap-4">
        {statCards.map((item) => (
          <StatCard
            key={item.label}
            label={item.label}
            value={hasLoaded ? item.value : "Loading..."}
            tone={item.tone}
            href={item.href}
            featured={item.featured}
          />
        ))}
      </div>
    );
  }

  function handleSaveShow() {
    if (!editingShowId || !showDate || !startTime || !endTime) {
      setEditError("Show date, start time, and finish time are required.");
      return;
    }

    const showId = editingShowId;

    startTransition(async () => {
      setEditError(null);
      setEditMessage(null);

      const startAt = toIsoString(showDate, startTime);
      const endAt = toIsoString(showDate, endTime);

      if (new Date(endAt).getTime() <= new Date(startAt).getTime()) {
        setEditError("Finish time must be after start time.");
        return;
      }

      try {
        const supabase = getSupabaseBrowserClient();
        const normalizedVenue = venue ? normalizeEmbeddableUrl(venue.trim()) : null;
        const { data, error } = await supabase.rpc("update_show", {
          p_show_id: showId,
          p_title: title || null,
          p_show_date: startAt,
          p_ends_at: endAt,
          p_submission_deadline: endAt,
          p_theme: theme || null,
          p_venue: normalizedVenue,
        });

        if (error) {
          setEditError(error.message);
          return;
        }

        const nextSnapshot = {
          ...snapshot,
          show_id: data.id,
          show_title: data.title,
          show_date: data.show_date,
          ends_at: data.ends_at,
          submission_deadline: data.submission_deadline,
          theme: data.theme,
          venue: data.venue,
        };

        setUpcomingShows((current) =>
          current.map((show) =>
            show.id === data.id
              ? {
                  ...show,
                  title: data.title,
                  show_date: data.show_date,
                  ends_at: data.ends_at,
                  submission_deadline: data.submission_deadline,
                  theme: data.theme,
                  venue: data.venue,
                }
              : show,
          ),
        );
        if (snapshot.show_id === data.id) {
          setSnapshot(nextSnapshot);
        }
        window.dispatchEvent(
          new CustomEvent("admin-show-created", {
            detail: nextSnapshot,
          }),
        );
        setEditMessage("Upcoming show updated.");
        setEditingShowId(null);
      } catch (error) {
        setEditError(
          error instanceof Error ? error.message : "Could not update the show.",
        );
      }
    });
  }

  return (
    <div className="rounded-[22px] border border-white/10 bg-white/[0.03] p-4">
      <PanelSearchInput
        label="Search upcoming shows"
        placeholder="Search by title, episode number, date, or status"
        value={showSearchQuery}
        onChange={setShowSearchQuery}
      />

      {showSearchQuery.trim().length > 0 &&
      showSearchQuery.trim().length < MIN_GLOBAL_SEARCH_QUERY_LENGTH ? (
        <div className="mt-4 rounded-2xl border border-dashed border-white/10 bg-white/[0.03] p-4 text-sm leading-6 text-zinc-300">
          Type at least {MIN_GLOBAL_SEARCH_QUERY_LENGTH} characters to search upcoming
          shows.
        </div>
      ) : null}

      {!hasLoaded ? (
        <p className="mt-4 text-sm leading-6 text-zinc-300">Loading upcoming show...</p>
      ) : isSearchingShows ? (
        <div className="mt-4 rounded-2xl border border-white/10 bg-white/[0.03] p-4 text-sm leading-6 text-zinc-300">
          Searching upcoming shows...
        </div>
      ) : showsError ? (
        <div className="mt-4 rounded-2xl border border-rose-400/30 bg-rose-400/10 p-4 text-sm leading-6 text-rose-100">
          {showsError}
        </div>
      ) : upcomingShows.length > 0 ? (
        <div className="mt-4 space-y-4">
          {upcomingShows.map((show, index) => {
            const isActiveCard = show.id === snapshot.show_id;
            const isEditingCard = editingShowId === show.id;

            return (
              <div
                key={show.id}
                className="rounded-[24px] border border-white/10 bg-black/20 p-4"
              >
                <div>
                  <p className="text-sm uppercase tracking-[0.3em] text-zinc-500">
                    {isActiveCard
                      ? "Current Show"
                      : `Queued Show ${index + 1}`}
                  </p>
                  <p className="mt-2 text-2xl font-semibold text-white">
                    {show.title}
                  </p>
                  <p className="mt-2 text-sm leading-6 text-zinc-300">
                    ID: {show.id}
                  </p>
                </div>

                <div className="mt-4 flex flex-wrap gap-3">
                  <button
                    type="button"
                    onClick={() => {
                      setEditError(null);
                      setEditMessage(null);
                      if (isEditingCard) {
                        setEditingShowId(null);
                        return;
                      }

                      syncForm(show);
                      setEditingShowId(show.id);
                    }}
                    className="rounded-2xl border border-white/10 bg-white/5 px-4 py-2 text-sm font-semibold text-white transition hover:bg-white/10"
                  >
                    {isEditingCard ? "Cancel Edit" : "Edit Show"}
                  </button>
                  {show.venue ? (
                    <Link
                      href={`/show/live?src=${encodeURIComponent(show.venue)}&title=${encodeURIComponent(show.title)}`}
                      className="rounded-2xl border border-white/10 bg-white/5 px-4 py-2 text-sm font-semibold text-white transition hover:bg-white/10"
                    >
                      View Show
                    </Link>
                  ) : null}
                </div>

                {isEditingCard ? (
                  <>
                    {editMessage ? (
                      <div className="mt-4 rounded-2xl border border-emerald-400/30 bg-emerald-400/10 px-4 py-3 text-sm text-emerald-100">
                        {editMessage}
                      </div>
                    ) : null}

                    {editError ? (
                      <div className="mt-4 rounded-2xl border border-rose-400/30 bg-rose-400/10 px-4 py-3 text-sm text-rose-100">
                        {editError}
                      </div>
                    ) : null}

                    <div className="mt-4 grid gap-4 rounded-2xl border border-white/10 bg-white/[0.03] p-4 md:grid-cols-2">
                      <label className="block md:col-span-2">
                        <span className="mb-2 block text-sm font-medium text-zinc-200">
                          Show title
                        </span>
                        <input
                          value={title}
                          onChange={(event) => setTitle(event.target.value)}
                          className="min-h-12 w-full rounded-2xl border border-white/10 bg-white/[0.04] px-4 text-white outline-none transition focus:border-amber-300/60"
                        />
                      </label>

                      <label className="block">
                        <span className="mb-2 block text-sm font-medium text-zinc-200">
                          Show date
                        </span>
                        <input
                          type="date"
                          value={showDate}
                          onChange={(event) => setShowDate(event.target.value)}
                          className="min-h-12 w-full rounded-2xl border border-white/10 bg-white/[0.04] px-4 text-white outline-none transition focus:border-amber-300/60"
                        />
                      </label>

                      <label className="block">
                        <span className="mb-2 block text-sm font-medium text-zinc-200">
                          Start time
                        </span>
                        <input
                          type="time"
                          value={startTime}
                          onChange={(event) => setStartTime(event.target.value)}
                          className="min-h-12 w-full rounded-2xl border border-white/10 bg-white/[0.04] px-4 text-white outline-none transition focus:border-amber-300/60"
                        />
                      </label>

                      <label className="block">
                        <span className="mb-2 block text-sm font-medium text-zinc-200">
                          Finish time
                        </span>
                        <input
                          type="time"
                          value={endTime}
                          onChange={(event) => setEndTime(event.target.value)}
                          className="min-h-12 w-full rounded-2xl border border-white/10 bg-white/[0.04] px-4 text-white outline-none transition focus:border-amber-300/60"
                        />
                      </label>

                      <label className="block">
                        <span className="mb-2 block text-sm font-medium text-zinc-200">
                          Theme
                        </span>
                        <input
                          value={theme}
                          onChange={(event) => setTheme(event.target.value)}
                          className="min-h-12 w-full rounded-2xl border border-white/10 bg-white/[0.04] px-4 text-white outline-none transition focus:border-amber-300/60"
                        />
                      </label>

                      <label className="block md:col-span-2">
                        <span className="mb-2 block text-sm font-medium text-zinc-200">
                          Venue
                        </span>
                        <input
                          value={venue}
                          onChange={(event) => setVenue(event.target.value)}
                          className="min-h-12 w-full rounded-2xl border border-white/10 bg-white/[0.04] px-4 text-white outline-none transition focus:border-amber-300/60"
                        />
                      </label>

                      <div className="md:col-span-2">
                        <button
                          type="button"
                          disabled={isPending}
                          onClick={handleSaveShow}
                          className="min-h-12 rounded-2xl bg-amber-300 px-5 py-3 text-sm font-bold uppercase tracking-[0.12em] text-black transition hover:bg-amber-200 disabled:cursor-not-allowed disabled:opacity-70"
                        >
                          {isPending ? "Saving..." : "Save Changes"}
                        </button>
                      </div>
                    </div>
                  </>
                ) : null}

                <details className="mt-4 rounded-2xl border border-white/10 bg-white/[0.03] p-4">
                  <summary className="cursor-pointer list-none text-sm font-semibold uppercase tracking-[0.24em] text-zinc-300">
                    Schedule
                  </summary>
                  <div className="mt-3 space-y-2 text-sm leading-6 text-zinc-300">
                    <p>Start: {formatDateTime(show.show_date)}</p>
                    <p>Finish: {formatDateTime(show.ends_at)}</p>
                  </div>
                </details>

                <details className="mt-4 rounded-2xl border border-white/10 bg-white/[0.03] p-4">
                  <summary className="cursor-pointer list-none text-sm font-semibold uppercase tracking-[0.24em] text-zinc-300">
                    {isActiveCard ? "Submission Window" : "Queued Details"}
                  </summary>
                  <div className="mt-3 space-y-2 text-sm leading-6 text-zinc-300">
                    <p>Cutoff: {formatDateTime(show.submission_deadline)}</p>
                    <p>Theme: {show.theme || "Not set"}</p>
                    <p>Venue: {show.venue || "Not set"}</p>
                    {isActiveCard ? (
                      <>
                        <p>{snapshot.places_left} places left</p>
                        <p>{snapshot.unplayed_count} unplayed tracks waiting</p>
                      </>
                    ) : (
                      <p>This show will activate after the current show ends.</p>
                    )}
                  </div>
                </details>
              </div>
            );
          })}
        </div>
      ) : showSearchQuery.trim().length >= MIN_GLOBAL_SEARCH_QUERY_LENGTH ? (
        <div className="mt-4 rounded-[24px] border border-dashed border-white/10 bg-white/[0.03] p-5 text-sm leading-7 text-zinc-300">
          No upcoming shows match that search.
        </div>
      ) : upcomingShows.length === 0 ? (
        <div className="mt-4 rounded-[24px] border border-dashed border-white/10 bg-white/[0.03] p-5 text-sm leading-7 text-zinc-300">
          No upcoming shows found.
        </div>
      ) : (
        <p className="mt-4 text-sm leading-6 text-zinc-300">
          No show created yet.
        </p>
      )}
    </div>
  );
}
