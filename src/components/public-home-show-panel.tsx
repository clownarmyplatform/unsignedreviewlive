"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { StatusPill } from "@/components/ui/status-pill";
import { UserAvatar } from "@/components/ui/user-avatar";
import { getSupabaseBrowserClient } from "@/lib/supabase/client";
import type { Database } from "@/lib/supabase/types";

type AdminSnapshot =
  Database["public"]["Functions"]["get_admin_dashboard_snapshot"]["Returns"][number];
type RecentSubmission =
  Database["public"]["Functions"]["get_public_recent_submissions"]["Returns"][number];

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

function formatShowStart(value: string | null) {
  if (!value) {
    return "the scheduled show time";
  }

  return new Date(value).toLocaleString(undefined, {
    weekday: "short",
    day: "numeric",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export function PublicHomeShowPanel() {
  const [snapshot, setSnapshot] = useState<AdminSnapshot>(emptySnapshot);
  const [submissions, setSubmissions] = useState<RecentSubmission[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [currentTime] = useState(() => Date.now());

  useEffect(() => {
    let isMounted = true;

    async function loadHomeData() {
      try {
        const supabase = getSupabaseBrowserClient();
        const [{ data: snapshotData }, { data: submissionsData }] = await Promise.all([
          supabase.rpc("get_admin_dashboard_snapshot"),
          supabase.rpc("get_public_recent_submissions"),
        ]);

        if (!isMounted) {
          return;
        }

        if (snapshotData?.[0]) {
          setSnapshot(snapshotData[0]);
        }

        setSubmissions(submissionsData ?? []);
      } finally {
        if (isMounted) {
          setIsLoading(false);
        }
      }
    }

    void loadHomeData();

    return () => {
      isMounted = false;
    };
  }, []);

  if (isLoading) {
    return (
      <div className="space-y-4 rounded-2xl border border-fuchsia-500/15 bg-[linear-gradient(180deg,rgba(16,11,31,0.88),rgba(8,7,18,0.74))] p-4 sm:p-5">
        <StatusPill tone="neutral">Loading</StatusPill>
        <p className="break-words text-zinc-300">
          Checking upcoming show and new submissions...
        </p>
      </div>
    );
  }

  if (!snapshot.show_id) {
    return (
      <div className="space-y-4 rounded-2xl border border-dashed border-white/10 bg-white/[0.03] p-4 sm:p-5">
        <StatusPill tone="warning">No upcoming show</StatusPill>
        <div>
          <p className="text-2xl font-bold text-white sm:text-3xl">
            Next show coming soon
          </p>
        </div>
      </div>
    );
  }

  const showStart = snapshot.show_date ? new Date(snapshot.show_date).getTime() : null;
  const showEnd = snapshot.ends_at ? new Date(snapshot.ends_at).getTime() : null;
  const isLiveWindow =
    currentTime !== null &&
    showStart !== null &&
    showEnd !== null &&
    currentTime >= showStart &&
    currentTime <= showEnd;
  const scheduledLabel = formatShowStart(snapshot.show_date);

  return (
    <div className="space-y-4 rounded-2xl border border-fuchsia-500/15 bg-[linear-gradient(180deg,rgba(16,11,31,0.88),rgba(8,7,18,0.74))] p-4 sm:p-5">
      <div className="flex flex-wrap gap-2">
        <StatusPill tone="accent">Upcoming Show</StatusPill>
        <StatusPill tone={snapshot.places_left > 0 ? "success" : "warning"}>
          {snapshot.places_left} places left
        </StatusPill>
      </div>

      <div>
        <p className="break-words text-2xl font-bold text-white sm:text-3xl">
          {snapshot.show_title}
        </p>
        <p className="mt-2 break-words text-zinc-300">
          {snapshot.show_date
            ? new Date(snapshot.show_date).toLocaleString()
            : "Start time not set"}
        </p>
        <div className="mt-2 space-y-1 text-sm text-zinc-400">
          <p className="break-all">
            <span className="text-zinc-500">Venue:</span> {snapshot.venue || "TBC"}
          </p>
          <p className="break-words">
            <span className="text-zinc-500">Theme:</span> {snapshot.theme || "TBC"}
          </p>
        </div>
      </div>

      <div className="flex flex-col items-end gap-3">
        <Link
          href="/submit"
          className="inline-flex min-h-10 items-center justify-center rounded-2xl border border-fuchsia-500/15 bg-[rgba(20,15,36,0.72)] px-4 py-2 text-center text-xs font-bold uppercase tracking-[0.12em] text-white transition hover:bg-white/10"
        >
          Submit Track
        </Link>

        {snapshot.venue && isLiveWindow ? (
          <Link
            href={`/show/live?src=${encodeURIComponent(snapshot.venue)}&title=${encodeURIComponent(snapshot.show_title ?? "Live Show")}`}
            className="inline-flex min-h-12 w-full items-center justify-center rounded-2xl bg-[linear-gradient(90deg,var(--brand-start),var(--brand-mid),var(--brand-end))] px-4 py-3 text-center text-sm font-bold uppercase tracking-[0.08em] text-white transition hover:brightness-110 sm:w-auto sm:px-5 sm:tracking-[0.12em]"
          >
            VIEW LIVE SHOW
          </Link>
        ) : (
          <span className="inline-flex min-h-12 w-full items-center justify-center rounded-2xl border border-fuchsia-400/30 bg-fuchsia-500/10 px-4 py-3 text-center text-sm font-bold uppercase tracking-[0.08em] text-fuchsia-100 sm:w-auto sm:px-5 sm:tracking-[0.12em]">
            VIEW SHOW HERE AT {scheduledLabel}
          </span>
        )}
      </div>

      <details className="group rounded-2xl border border-cyan-500/15 bg-[linear-gradient(180deg,rgba(11,11,27,0.92),rgba(7,9,20,0.82))] p-4">
        <summary className="flex cursor-pointer list-none items-center justify-between gap-3 text-white">
          <div className="min-w-0">
            <p className="text-sm uppercase tracking-[0.3em] text-zinc-500">
              New Submissions
            </p>
            <p className="mt-1 break-words font-semibold">
              {submissions.length > 0
                ? `${submissions.length} recent tracks for this show`
                : "No submissions"}
            </p>
          </div>
          <span className="text-sm text-zinc-400 transition group-open:rotate-180">
            v
          </span>
        </summary>

        <div className="mt-4 space-y-3">
          {submissions.length > 0 ? (
            submissions.map((submission) => (
              <div
                key={submission.id}
                className="flex items-start gap-3 rounded-xl border border-fuchsia-500/15 bg-[linear-gradient(180deg,rgba(16,11,31,0.88),rgba(8,7,18,0.74))] p-3"
              >
                <UserAvatar
                  imageUrl={submission.avatar_url}
                  name={submission.artist_name}
                  className="h-10 w-10"
                  textClassName="text-xs"
                />
                <div className="min-w-0">
                  <p className="break-words font-semibold text-white">
                    {submission.artist_name} - {submission.track_title}
                  </p>
                  <p className="mt-1 break-words text-sm text-zinc-400">
                    {submission.genre} |{" "}
                    {new Date(submission.created_at).toLocaleString()}
                  </p>
                </div>
              </div>
            ))
          ) : (
            <p className="text-sm leading-6 text-zinc-300">No submissions yet.</p>
          )}
        </div>
      </details>
    </div>
  );
}
