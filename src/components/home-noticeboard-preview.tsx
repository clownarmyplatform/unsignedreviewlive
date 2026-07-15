"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { formatNoticeboardDate, type NoticeboardPost } from "@/lib/noticeboard";
import { getSupabaseBrowserClient } from "@/lib/supabase/client";
import { StatusPill } from "@/components/ui/status-pill";

function createSnippet(value: string) {
  return value
    .replace(/!\[[^\]]*\]\([^)]+\)/g, "")
    .replace(/\[([^\]]+)\]\([^)]+\)/g, "$1")
    .replace(/[*_`>#~-]/g, "")
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, 150);
}

export function HomeNoticeboardPreview() {
  const [posts, setPosts] = useState<NoticeboardPost[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  useEffect(() => {
    let isMounted = true;

    async function loadPosts() {
      try {
        const supabase = getSupabaseBrowserClient();
        const { data, error } = await supabase.rpc("get_noticeboard_posts");

        if (!isMounted) {
          return;
        }

        if (error) {
          setErrorMessage(error.message);
          return;
        }

        setPosts((data ?? []).slice(0, 2));
      } catch (error) {
        if (isMounted) {
          setErrorMessage(
            error instanceof Error
              ? error.message
              : "Could not load noticeboard updates.",
          );
        }
      } finally {
        if (isMounted) {
          setIsLoading(false);
        }
      }
    }

    loadPosts();

    return () => {
      isMounted = false;
    };
  }, []);

  if (isLoading) {
    return (
      <div className="rounded-[22px] border border-fuchsia-500/15 bg-[linear-gradient(180deg,rgba(16,11,31,0.88),rgba(8,7,18,0.74))] p-4 text-sm leading-6 text-zinc-300">
        Loading noticeboard updates...
      </div>
    );
  }

  if (errorMessage) {
    return (
      <div className="rounded-[22px] border border-rose-400/30 bg-rose-400/10 p-4 text-sm leading-6 text-rose-100">
        {errorMessage}
      </div>
    );
  }

  if (posts.length === 0) {
    return (
      <div className="rounded-[22px] border border-dashed border-white/10 bg-white/[0.03] p-4 text-sm leading-6 text-zinc-300">
        No noticeboard posts yet.
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {posts.map((post) => (
        <Link
          key={post.id}
          href={`/noticeboard#noticeboard-post-${post.id}`}
          className="block rounded-[22px] border border-fuchsia-500/15 bg-[linear-gradient(180deg,rgba(16,11,31,0.88),rgba(8,7,18,0.74))] p-4 transition hover:border-white/20 hover:bg-white/[0.05]"
        >
          <div className="flex items-center justify-between gap-3">
            <p className="font-semibold text-white">{post.title}</p>
            {post.tag ? <StatusPill tone="neutral">{post.tag}</StatusPill> : null}
          </div>
          <p className="mt-2 text-sm leading-6 text-zinc-300">
            {createSnippet(post.body)}
          </p>
          <p className="mt-3 text-xs uppercase tracking-[0.24em] text-zinc-500">
            {formatNoticeboardDate(post.posted_at)}
          </p>
        </Link>
      ))}
    </div>
  );
}
