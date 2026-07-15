"use client";

import { useEffect, useState } from "react";
import { getSupabaseBrowserClient } from "@/lib/supabase/client";
import type { Database } from "@/lib/supabase/types";
import { StatusPill } from "@/components/ui/status-pill";

type LatestTotnWinner =
  Database["public"]["Functions"]["get_latest_totn_winner"]["Returns"][number];

export function LatestTotnWinnerPanel() {
  const [winner, setWinner] = useState<LatestTotnWinner | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    let isMounted = true;

    async function loadWinner() {
      try {
        const supabase = getSupabaseBrowserClient();
        const { data } = await supabase.rpc("get_latest_totn_winner");

        if (isMounted) {
          setWinner(data?.[0] ?? null);
        }
      } finally {
        if (isMounted) {
          setIsLoading(false);
        }
      }
    }

    void loadWinner();

    return () => {
      isMounted = false;
    };
  }, []);

  if (isLoading) {
    return (
      <div className="rounded-[24px] border border-fuchsia-500/15 bg-[linear-gradient(180deg,rgba(16,11,31,0.88),rgba(8,7,18,0.74))] p-5 text-sm leading-7 text-zinc-300">
        Loading previous TOTN winner...
      </div>
    );
  }

  if (!winner) {
    return (
      <div className="rounded-[24px] border border-dashed border-white/10 bg-white/[0.03] p-5 text-sm leading-7 text-zinc-300">
        No closed TOTN result yet.
      </div>
    );
  }

  return (
    <div className="rounded-[24px] border border-fuchsia-500/15 bg-[linear-gradient(180deg,rgba(16,11,31,0.88),rgba(8,7,18,0.74))] p-5">
      <div className="flex flex-wrap items-center gap-3">
        <StatusPill tone="accent">Winner</StatusPill>
        <StatusPill tone="success">{winner.votes} votes</StatusPill>
      </div>
      <p className="mt-4 text-2xl font-semibold text-white">
        {winner.artist_name} - {winner.track_title}
      </p>
      <p className="mt-2 text-sm leading-6 text-zinc-300">
        Show: {winner.show_title}
      </p>
    </div>
  );
}
