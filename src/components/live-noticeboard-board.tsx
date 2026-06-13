"use client";

import { useEffect, useState } from "react";
import { NoticeboardMarkdown } from "@/components/noticeboard-markdown";
import { StatusPill } from "@/components/ui/status-pill";
import {
  formatNoticeboardDate,
  type NoticeboardPost,
} from "@/lib/noticeboard";
import { getSupabaseBrowserClient } from "@/lib/supabase/client";

export function LiveNoticeboardBoard() {
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

        setPosts(data ?? []);
      } catch (error) {
        if (isMounted) {
          setErrorMessage(
            error instanceof Error
              ? error.message
              : "Could not load the noticeboard.",
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

  useEffect(() => {
    if (typeof window === "undefined" || posts.length === 0) {
      return;
    }

    function revealHashTarget() {
      const targetId = window.location.hash.replace("#", "");

      if (!targetId.startsWith("noticeboard-post-")) {
        return;
      }

      const targetElement = document.getElementById(targetId);

      if (!(targetElement instanceof HTMLElement)) {
        return;
      }

      targetElement.scrollIntoView({ behavior: "smooth", block: "start" });
    }

    window.setTimeout(revealHashTarget, 0);
    window.addEventListener("hashchange", revealHashTarget);

    return () => {
      window.removeEventListener("hashchange", revealHashTarget);
    };
  }, [posts]);

  if (isLoading) {
    return (
      <div className="rounded-[24px] border border-white/10 bg-white/[0.03] p-5 text-sm leading-7 text-zinc-300">
        Loading noticeboard posts...
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

  if (posts.length === 0) {
    return (
      <div className="rounded-[24px] border border-dashed border-white/10 bg-white/[0.03] p-5 text-sm leading-7 text-zinc-300">
        No posts yet.
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {posts.map((post) => (
        <article
          key={post.id}
          id={`noticeboard-post-${post.id}`}
          className="scroll-mt-28 rounded-[24px] border border-white/10 bg-white/[0.03] p-5"
        >
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <h2 className="text-xl font-semibold text-white">{post.title}</h2>
            {post.tag ? <StatusPill tone="neutral">{post.tag}</StatusPill> : null}
          </div>

          {post.image_url ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={post.image_url}
              alt={post.title}
              className="mt-4 max-h-80 w-full rounded-[22px] border border-white/10 object-cover"
            />
          ) : null}

          <div className="mt-4">
            <NoticeboardMarkdown content={post.body} />
          </div>

          <p className="mt-4 text-xs uppercase tracking-[0.24em] text-zinc-500">
            {formatNoticeboardDate(post.posted_at)}
          </p>
        </article>
      ))}
    </div>
  );
}
