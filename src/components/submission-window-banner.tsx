"use client";

import { useEffect, useState } from "react";
import { getSupabaseBrowserClient } from "@/lib/supabase/client";
import {
  getSubmissionWindowMessage,
  type SubmissionWindowStatus,
} from "@/lib/submission-window";

type SubmissionWindowBannerProps = {
  variant?: "default" | "compact";
};

export function SubmissionWindowBanner({
  variant = "default",
}: SubmissionWindowBannerProps) {
  const [status, setStatus] = useState<SubmissionWindowStatus | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  useEffect(() => {
    let isMounted = true;

    async function loadStatus() {
      try {
        const supabase = getSupabaseBrowserClient();
        const { data, error } = await supabase.rpc("get_submission_window_status");

        if (!isMounted) {
          return;
        }

        if (error) {
          setErrorMessage("Places left unavailable");
          return;
        }

        setStatus(data?.[0] ?? null);
      } catch {
        if (isMounted) {
          setErrorMessage("Places left unavailable");
        }
      } finally {
        if (isMounted) {
          setIsLoading(false);
        }
      }
    }

    loadStatus();

    return () => {
      isMounted = false;
    };
  }, []);

  const compact = variant === "compact";
  const resolvedMessage = isLoading
    ? "Checking places left..."
    : errorMessage ?? getSubmissionWindowMessage(status);
  const full = !isLoading && !!status && (!status.is_open || status.places_left <= 0);

  return (
    <div
      className={`rounded-[24px] border px-4 py-4 ${
        full
          ? "border-rose-400/30 bg-rose-400/10"
          : "border-amber-300/25 bg-amber-300/10"
      } ${compact ? "" : "sm:px-5"}`}
    >
      <p
        className={`font-semibold text-white ${
          compact ? "text-base" : "text-lg"
        }`}
      >
        {resolvedMessage}
      </p>
      {!isLoading && status ? (
        <p className="mt-2 text-sm text-zinc-300">
          {status.current_submission_count} of {status.submission_limit} places taken
        </p>
      ) : null}
    </div>
  );
}
