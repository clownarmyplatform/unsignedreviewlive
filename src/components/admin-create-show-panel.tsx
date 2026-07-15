"use client";

import { useEffect, useState, useTransition } from "react";
import { getSupabaseBrowserClient } from "@/lib/supabase/client";
import { normalizeEmbeddableUrl } from "@/lib/media-embed";
import {
  getSubmissionWindowMessage,
  type SubmissionWindowStatus,
} from "@/lib/submission-window";
import type { Database } from "@/lib/supabase/types";

type ShowRow = Database["public"]["Tables"]["shows"]["Row"];

type CreateShowState =
  | { type: "idle" }
  | { type: "success"; message: string }
  | { type: "error"; message: string };

function formatDateInput(date: Date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");

  return `${year}-${month}-${day}`;
}

function getNextTuesdayDate() {
  const now = new Date();
  const next = new Date(now);
  const currentDay = next.getDay();
  let daysUntilTuesday = (2 - currentDay + 7) % 7;

  if (daysUntilTuesday === 0) {
    daysUntilTuesday = 7;
  }

  next.setDate(next.getDate() + daysUntilTuesday);
  return next;
}

function toIsoString(date: string, time: string) {
  return new Date(`${date}T${time}:00`).toISOString();
}

const nextTuesday = getNextTuesdayDate();

export function AdminCreateShowPanel() {
  const [title, setTitle] = useState("");
  const [showDate, setShowDate] = useState(formatDateInput(nextTuesday));
  const [startTime, setStartTime] = useState("19:30");
  const [endTime, setEndTime] = useState("22:00");
  const [theme, setTheme] = useState("");
  const [venue, setVenue] = useState("");
  const [latestCreatedShow, setLatestCreatedShow] = useState<ShowRow | null>(null);
  const [submissionWindow, setSubmissionWindow] =
    useState<SubmissionWindowStatus | null>(null);
  const [state, setState] = useState<CreateShowState>({ type: "idle" });
  const [isPending, startTransition] = useTransition();

  async function loadSubmissionWindow() {
    try {
      const supabase = getSupabaseBrowserClient();
      const { data } = await supabase.rpc("get_submission_window_status");
      setSubmissionWindow(data?.[0] ?? null);
    } catch {
      setSubmissionWindow(null);
    }
  }

  useEffect(() => {
    let isMounted = true;

    void (async () => {
      try {
        const supabase = getSupabaseBrowserClient();
        const { data } = await supabase.rpc("get_submission_window_status");

        if (isMounted) {
          setSubmissionWindow(data?.[0] ?? null);
        }
      } catch {
        if (isMounted) {
          setSubmissionWindow(null);
        }
      }
    })();

    return () => {
      isMounted = false;
    };
  }, []);

  function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();

    startTransition(async () => {
      setState({ type: "idle" });

      const startAt = toIsoString(showDate, startTime);
      const endAt = toIsoString(showDate, endTime);
      const normalizedVenue = venue ? normalizeEmbeddableUrl(venue.trim()) : null;

      if (new Date(endAt).getTime() <= new Date(startAt).getTime()) {
        setState({
          type: "error",
          message: "Finish time must be after start time.",
        });
        return;
      }

      try {
        const supabase = getSupabaseBrowserClient();
        const { data, error } = await supabase.rpc("create_show", {
          p_title: title || null,
          p_show_date: startAt,
          p_ends_at: endAt,
          p_submission_deadline: endAt,
          p_theme: theme || null,
          p_venue: normalizedVenue,
        });

        if (error) {
          setState({
            type: "error",
            message: error.message,
          });
          return;
        }

        setLatestCreatedShow(data);
        await loadSubmissionWindow();
        window.dispatchEvent(new Event("admin-show-created"));
        setState({
          type: "success",
          message: `Show created successfully. Supabase show ID: ${data.id}`,
        });
      } catch (error) {
        const message =
          error instanceof Error ? error.message : "Could not create the show.";

        setState({
          type: "error",
          message,
        });
      }
    });
  }

  return (
    <div className="grid gap-6 xl:grid-cols-[1.1fr_0.9fr]">
      <form className="space-y-4" onSubmit={handleSubmit}>
        <div className="grid gap-4 md:grid-cols-2">
          <label className="block md:col-span-2">
            <span className="mb-2 block text-sm font-medium text-zinc-200">
              Show title
            </span>
            <input
              value={title}
              onChange={(event) => setTitle(event.target.value)}
              placeholder="Optional. Leave blank to auto-generate."
              className="min-h-12 w-full rounded-2xl border border-cyan-500/15 bg-[linear-gradient(180deg,rgba(18,12,35,0.92),rgba(8,8,20,0.76))] px-4 text-white outline-none transition placeholder:text-zinc-500 focus:border-fuchsia-400/60 focus:shadow-[0_0_0_1px_rgba(255,45,166,0.24)]"
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
              className="min-h-12 w-full rounded-2xl border border-cyan-500/15 bg-[linear-gradient(180deg,rgba(18,12,35,0.92),rgba(8,8,20,0.76))] px-4 text-white outline-none transition focus:border-fuchsia-400/60 focus:shadow-[0_0_0_1px_rgba(255,45,166,0.24)]"
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
              className="min-h-12 w-full rounded-2xl border border-cyan-500/15 bg-[linear-gradient(180deg,rgba(18,12,35,0.92),rgba(8,8,20,0.76))] px-4 text-white outline-none transition focus:border-fuchsia-400/60 focus:shadow-[0_0_0_1px_rgba(255,45,166,0.24)]"
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
              className="min-h-12 w-full rounded-2xl border border-cyan-500/15 bg-[linear-gradient(180deg,rgba(18,12,35,0.92),rgba(8,8,20,0.76))] px-4 text-white outline-none transition focus:border-fuchsia-400/60 focus:shadow-[0_0_0_1px_rgba(255,45,166,0.24)]"
            />
          </label>

          <label className="block">
            <span className="mb-2 block text-sm font-medium text-zinc-200">
              Theme
            </span>
            <input
              value={theme}
              onChange={(event) => setTheme(event.target.value)}
              placeholder="Optional"
              className="min-h-12 w-full rounded-2xl border border-cyan-500/15 bg-[linear-gradient(180deg,rgba(18,12,35,0.92),rgba(8,8,20,0.76))] px-4 text-white outline-none transition placeholder:text-zinc-500 focus:border-fuchsia-400/60 focus:shadow-[0_0_0_1px_rgba(255,45,166,0.24)]"
            />
          </label>

          <label className="block md:col-span-2">
            <span className="mb-2 block text-sm font-medium text-zinc-200">
              Venue
            </span>
            <input
              value={venue}
              onChange={(event) => setVenue(event.target.value)}
              placeholder="Optional link or stream URL"
              className="min-h-12 w-full rounded-2xl border border-cyan-500/15 bg-[linear-gradient(180deg,rgba(18,12,35,0.92),rgba(8,8,20,0.76))] px-4 text-white outline-none transition placeholder:text-zinc-500 focus:border-fuchsia-400/60 focus:shadow-[0_0_0_1px_rgba(255,45,166,0.24)]"
            />
          </label>
        </div>

        <div className="rounded-2xl border border-fuchsia-500/15 bg-[linear-gradient(180deg,rgba(16,11,31,0.88),rgba(8,7,18,0.74))] px-4 py-3 text-sm leading-6 text-zinc-300">
          Default schedule is the next Tuesday from 19:30 to 22:00. Supabase
          already creates a unique UUID for every show, and submissions attach to
          that show ID automatically. Supported media venue links such as YouTube are
          normalized to embed-friendly URLs on save.
        </div>

        {state.type !== "idle" ? (
          <div
            className={`rounded-2xl border px-4 py-3 text-sm leading-6 ${
              state.type === "success"
                ? "border-emerald-400/30 bg-emerald-400/10 text-emerald-100"
                : "border-rose-400/30 bg-rose-400/10 text-rose-100"
            }`}
          >
            {state.message}
          </div>
        ) : null}

        <button
          type="submit"
          disabled={isPending}
          className="min-h-12 rounded-2xl bg-[linear-gradient(90deg,var(--brand-start),var(--brand-mid),var(--brand-end))] px-5 py-3 text-sm font-bold uppercase tracking-[0.12em] text-white transition hover:brightness-110 disabled:cursor-not-allowed disabled:opacity-70"
        >
          {isPending ? "Creating..." : "Create Show"}
        </button>
      </form>

      <div className="space-y-4">
        <div className="rounded-[24px] border border-fuchsia-500/15 bg-[linear-gradient(180deg,rgba(16,11,31,0.88),rgba(8,7,18,0.74))] p-4">
          <p className="text-sm uppercase tracking-[0.3em] text-zinc-500">
            Current Submission Target
          </p>
          <p className="mt-2 text-lg font-semibold text-white">
            {getSubmissionWindowMessage(submissionWindow)}
          </p>
          {submissionWindow ? (
            <p className="mt-2 text-sm leading-6 text-zinc-300">
              Active show ID: {submissionWindow.show_id}
            </p>
          ) : (
            <p className="mt-2 text-sm leading-6 text-zinc-300">
              No upcoming show is currently accepting submissions.
            </p>
          )}
        </div>

        <div className="rounded-[24px] border border-fuchsia-500/15 bg-[linear-gradient(180deg,rgba(16,11,31,0.88),rgba(8,7,18,0.74))] p-4">
          <p className="text-sm uppercase tracking-[0.3em] text-zinc-500">
            Latest Created Show
          </p>
          {latestCreatedShow ? (
            <div className="mt-2 space-y-2 text-sm leading-6 text-zinc-300">
              <p className="text-lg font-semibold text-white">
                {latestCreatedShow.title}
              </p>
              <p>Start: {new Date(latestCreatedShow.show_date).toLocaleString()}</p>
              <p>Finish: {new Date(latestCreatedShow.ends_at).toLocaleString()}</p>
              <p>ID: {latestCreatedShow.id}</p>
            </div>
          ) : (
            <p className="mt-2 text-sm leading-6 text-zinc-300">
              Create a show here to make it available as the next submission target.
            </p>
          )}
        </div>
      </div>
    </div>
  );
}
