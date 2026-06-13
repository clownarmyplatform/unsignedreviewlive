"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { StatusPill } from "@/components/ui/status-pill";
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

    loadHomeData();

    return () => {
      isMounted = false;
    };
  }, []);

  if (isLoading) {
    return (
      <div className="space-y-4 rounded-2xl border border-white/10 bg-white/[0.03] p-5">
        <StatusPill tone="neutral">Loading</StatusPill>
        <p className="text-zinc-300">Checking upcoming show and new submissions...</p>
      </div>
    );
  }

  if (!snapshot.show_id) {
    return (
      <div className="space-y-4 rounded-2xl border border-dashed border-white/10 bg-white/[0.03] p-5">
        <StatusPill tone="warning">No upcoming show</StatusPill>
        <div>
          <p className="text-3xl font-bold text-white">Next show coming soon</p>
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
    <div className="space-y-4 rounded-2xl border border-white/10 bg-white/[0.03] p-5">
      <div className="flex flex-wrap gap-2">
        <StatusPill tone="accent">Upcoming Show</StatusPill>
        <StatusPill tone={snapshot.places_left > 0 ? "success" : "warning"}>
          {snapshot.places_left} places left
        </StatusPill>
      </div>

      <div>
        <p className="text-3xl font-bold text-white">{snapshot.show_title}</p>
        <p className="mt-2 text-zinc-300">
          {snapshot.show_date
            ? new Date(snapshot.show_date).toLocaleString()
            : "Start time not set"}
        </p>
        <p className="mt-1 text-sm text-zinc-400">
          Venue: {snapshot.venue || "TBC"} • Theme: {snapshot.theme || "TBC"}
        </p>
      </div>

      {snapshot.venue && isLiveWindow ? (
        <div>
          <Link
            href={`/show/live?src=${encodeURIComponent(snapshot.venue)}&title=${encodeURIComponent(snapshot.show_title ?? "Live Show")}`}
            className="inline-flex min-h-12 items-center justify-center rounded-2xl bg-amber-300 px-5 py-3 text-sm font-bold uppercase tracking-[0.12em] text-black transition hover:bg-amber-200"
          >
            VIEW LIVE SHOW
          </Link>
        </div>
      ) : (
        <div>
          <span className="inline-flex min-h-12 items-center justify-center rounded-2xl border border-amber-300/30 bg-amber-300/10 px-5 py-3 text-sm font-bold uppercase tracking-[0.12em] text-amber-100">
            VIEW SHOW HERE AT {scheduledLabel}
          </span>
        </div>
      )}

      <details className="group rounded-2xl border border-white/10 bg-black/20 p-4">
        <summary className="flex cursor-pointer list-none items-center justify-between gap-3 text-white">
          <div>
            <p className="text-sm uppercase tracking-[0.3em] text-zinc-500">
              New Submissions
            </p>
            <p className="mt-1 font-semibold">
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
                className="rounded-xl border border-white/10 bg-white/[0.03] p-3"
              >
                <p className="font-semibold text-white">
                  {submission.artist_name} - {submission.track_title}
                </p>
                <p className="mt-1 text-sm text-zinc-400">
                  {submission.genre} •{" "}
                  {new Date(submission.created_at).toLocaleString()}
                </p>
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
