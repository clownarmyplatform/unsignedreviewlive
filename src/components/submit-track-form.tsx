"use client";

import Link from "next/link";
import { useEffect, useState, useTransition } from "react";
import { useAuth } from "@/components/providers/auth-provider";
import { getSupabaseBrowserClient } from "@/lib/supabase/client";
import {
  getSubmissionWindowMessage,
  type SubmissionWindowStatus,
} from "@/lib/submission-window";
import type { Database } from "@/lib/supabase/types";

const fields = [
  {
    name: "artist_name",
    label: "Artist name",
    type: "text",
    placeholder: "Your artist or band name",
  },
  {
    name: "track_title",
    label: "Track title",
    type: "text",
    placeholder: "Name of the submitted track",
  },
  {
    name: "track_url",
    label: "Link URL",
    type: "url",
    placeholder: "https://...",
  },
  {
    name: "genre",
    label: "Genre",
    type: "text",
    placeholder: "Indie, punk, drill, synthwave...",
  },
] as const;

type SubmissionState =
  | { type: "idle" }
  | { type: "success"; message: string }
  | { type: "error"; message: string };

const initialState: SubmissionState = { type: "idle" };

type SubmissionRow = Database["public"]["Tables"]["submissions"]["Row"];

function createSubmissionAttemptId() {
  return crypto.randomUUID();
}

export function SubmitTrackForm() {
  const { session, user } = useAuth();
  const [submissionState, setSubmissionState] =
    useState<SubmissionState>(initialState);
  const [windowStatus, setWindowStatus] = useState<SubmissionWindowStatus | null>(
    null,
  );
  const [existingSubmission, setExistingSubmission] = useState<SubmissionRow | null>(
    null,
  );
  const [isLoadingWindow, setIsLoadingWindow] = useState(true);
  const [isPending, startTransition] = useTransition();
  const [submissionAttemptId, setSubmissionAttemptId] = useState(
    createSubmissionAttemptId,
  );

  useEffect(() => {
    let isMounted = true;

    async function loadWindowStatus() {
      try {
        const supabase = getSupabaseBrowserClient();
        const { data, error } = await supabase.rpc("get_submission_window_status");

        if (!isMounted) {
          return;
        }

        if (error) {
          setSubmissionState({
            type: "error",
            message: "Could not load the current submission window.",
          });
          return;
        }

        setWindowStatus(data?.[0] ?? null);
      } catch {
        if (isMounted) {
          setSubmissionState({
            type: "error",
            message: "Could not load the current submission window.",
          });
        }
      } finally {
        if (isMounted) {
          setIsLoadingWindow(false);
        }
      }
    }

    loadWindowStatus();

    return () => {
      isMounted = false;
    };
  }, []);

  useEffect(() => {
    let isMounted = true;

    async function loadExistingSubmission() {
      if (!user || !windowStatus?.show_id) {
        if (isMounted) {
          setExistingSubmission(null);
        }
        return;
      }

      try {
        const supabase = getSupabaseBrowserClient();
        const { data } = await supabase
          .from("submissions")
          .select("*")
          .eq("auth_user_id", user.id)
          .eq("show_id", windowStatus.show_id)
          .in("moderation_status", ["pending_review", "approved"])
          .order("created_at", { ascending: true })
          .limit(1);

        if (isMounted) {
          setExistingSubmission(data?.[0] ?? null);
        }
      } catch {
        if (isMounted) {
          setExistingSubmission(null);
        }
      }
    }

    loadExistingSubmission();

    return () => {
      isMounted = false;
    };
  }, [user, windowStatus?.show_id]);

  function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = event.currentTarget;
    const formData = new FormData(form);

    const artistName = String(formData.get("artist_name") ?? "").trim();
    const trackTitle = String(formData.get("track_title") ?? "").trim();
    const trackUrl = String(formData.get("track_url") ?? "").trim();
    const genre = String(formData.get("genre") ?? "").trim();
    const message = String(formData.get("message") ?? "").trim() || null;
    const rightsConfirmed = formData.get("rights_confirmed") === "on";

    startTransition(async () => {
      setSubmissionState(initialState);

      if (
        !artistName ||
        !trackTitle ||
        !trackUrl ||
        !genre ||
        !rightsConfirmed
      ) {
        setSubmissionState({
          type: "error",
          message:
            "Please complete every required field and confirm you have the rights to submit the track.",
        });
        return;
      }

      if (!windowStatus || !windowStatus.is_open || windowStatus.places_left <= 0) {
        setSubmissionState({
          type: "error",
          message: "Sorry, the queue for this show is full",
        });
        return;
      }

      if (existingSubmission) {
        setSubmissionState({
          type: "error",
          message:
            "You already have a track submitted for this show. Please edit your existing submission from your dashboard.",
        });
        return;
      }

      try {
        if (!session?.access_token) {
          setSubmissionState({
            type: "error",
            message: "You must be signed in to submit a track.",
          });
          return;
        }

        const response = await fetch("/api/submissions", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${session.access_token}`,
          },
          body: JSON.stringify({
            artist_name: artistName,
            track_title: trackTitle,
            track_url: trackUrl,
            genre,
            message,
            rights_confirmed: rightsConfirmed,
            submission_attempt_id: submissionAttemptId,
          }),
        });
        const payload = (await response.json()) as {
          error?: string;
          message?: string;
          submission?: SubmissionRow;
        };

        if (!response.ok || !payload.submission) {
          setSubmissionState({
            type: "error",
            message:
              payload.error ?? "Something went wrong while submitting your track.",
          });
          return;
        }

        form.reset();
        setExistingSubmission(payload.submission);
        setWindowStatus((current) =>
          current
            ? {
                ...current,
                current_submission_count: current.current_submission_count + 1,
                places_left: Math.max(current.places_left - 1, 0),
                is_open: current.places_left - 1 > 0,
              }
            : current,
        );
        setSubmissionAttemptId(createSubmissionAttemptId());
        setSubmissionState({
          type: "success",
          message: payload.message ?? "Track submitted successfully.",
        });
      } catch (error) {
        const message =
          error instanceof Error
            ? error.message
            : "Something went wrong while submitting your track.";

        setSubmissionState({
          type: "error",
          message,
        });
      }
    });
  }

  const queueIsFull =
    !isLoadingWindow && (!!windowStatus && (!windowStatus.is_open || windowStatus.places_left <= 0));
  const alreadySubmittedForShow = !!existingSubmission;
  const disableForm =
    isPending ||
    isLoadingWindow ||
    !windowStatus ||
    queueIsFull ||
    alreadySubmittedForShow;
  const defaultArtistName = String(user?.user_metadata.display_name ?? "").trim();

  return (
    <form className="space-y-4" onSubmit={handleSubmit}>
      <div className="rounded-2xl border border-fuchsia-500/15 bg-[linear-gradient(180deg,rgba(16,11,31,0.88),rgba(8,7,18,0.74))] px-4 py-3">
        <p className="text-xs uppercase tracking-[0.28em] text-zinc-500">
          Submission Window
        </p>
        <p className="mt-2 text-sm leading-6 text-zinc-200">
          {isLoadingWindow
            ? "Checking places left..."
            : getSubmissionWindowMessage(windowStatus)}
        </p>
        {user?.email ? (
          <p className="mt-2 text-sm leading-6 text-zinc-400">
            Signed in as {user.email}. Your submission will attach to this account.
          </p>
        ) : null}
        {alreadySubmittedForShow ? (
          <p className="mt-2 text-sm leading-6 text-fuchsia-100">
            You already have one track in this show. Edit it from{" "}
            <Link href="/dashboard" className="underline underline-offset-4">
              your dashboard
            </Link>{" "}
            if you need to correct something.
          </p>
        ) : null}
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        {fields.map((field) => (
          <label key={field.name} className="block">
            <span className="mb-2 block text-sm font-medium text-zinc-200">
              {field.label}
            </span>
            <input
              required
              name={field.name}
              type={field.type}
              placeholder={field.placeholder}
              disabled={disableForm}
              defaultValue={field.name === "artist_name" ? defaultArtistName : undefined}
              className="min-h-12 w-full rounded-2xl border border-cyan-500/15 bg-[linear-gradient(180deg,rgba(18,12,35,0.92),rgba(8,8,20,0.76))] px-4 text-white outline-none transition placeholder:text-zinc-500 focus:border-fuchsia-400/60 focus:shadow-[0_0_0_1px_rgba(255,45,166,0.24)]"
            />
          </label>
        ))}
      </div>

      <label className="block">
        <span className="mb-2 block text-sm font-medium text-zinc-200">
          Optional message
        </span>
        <textarea
          name="message"
          rows={5}
          placeholder="Anything the hosts should know before the show?"
          disabled={disableForm}
          className="w-full rounded-2xl border border-cyan-500/15 bg-[linear-gradient(180deg,rgba(18,12,35,0.92),rgba(8,8,20,0.76))] px-4 py-3 text-white outline-none transition placeholder:text-zinc-500 focus:border-fuchsia-400/60 focus:shadow-[0_0_0_1px_rgba(255,45,166,0.24)]"
        />
      </label>

      <label className="flex items-start gap-3 rounded-2xl border border-fuchsia-500/15 bg-[linear-gradient(180deg,rgba(16,11,31,0.88),rgba(8,7,18,0.74))] p-4">
        <input
          required
          name="rights_confirmed"
          type="checkbox"
          disabled={disableForm}
          className="mt-1 h-5 w-5 rounded border-white/10 bg-transparent accent-fuchsia-500"
        />
        <span className="text-sm leading-6 text-zinc-300">
          I confirm that I own this track or have the rights and permission to
          submit it for play and review.
        </span>
      </label>

      {submissionState.type !== "idle" ? (
        <div
          className={`rounded-2xl border px-4 py-3 text-sm leading-6 ${
            submissionState.type === "success"
              ? "border-emerald-400/30 bg-emerald-400/10 text-emerald-100"
              : "border-rose-400/30 bg-rose-400/10 text-rose-100"
          }`}
        >
          {submissionState.message}
        </div>
      ) : null}

      <button
        type="submit"
        disabled={disableForm}
        className="min-h-12 rounded-2xl bg-[linear-gradient(90deg,var(--brand-start),var(--brand-mid),var(--brand-end))] px-5 py-3 text-sm font-bold uppercase tracking-[0.12em] text-white transition hover:brightness-110 disabled:cursor-not-allowed disabled:opacity-70"
      >
        {isPending
          ? "Submitting..."
          : alreadySubmittedForShow
            ? "Already Submitted"
            : queueIsFull
              ? "Queue Full"
              : "Submit Track"}
      </button>
    </form>
  );
}
