"use client";

import { useEffect, useRef, useState, useTransition } from "react";
import { NoticeboardMarkdown } from "@/components/noticeboard-markdown";
import { PanelSearchInput } from "@/components/ui/panel-search-input";
import { StatusPill } from "@/components/ui/status-pill";
import { useDebouncedValue } from "@/hooks/use-debounced-value";
import {
  GLOBAL_SEARCH_DEBOUNCE_MS,
  MIN_GLOBAL_SEARCH_QUERY_LENGTH,
} from "@/lib/global-search";
import {
  formatNoticeboardDate,
  NOTICEBOARD_IMAGE_ACCEPTED_TYPES,
  NOTICEBOARD_IMAGE_MAX_BYTES,
  type NoticeboardPost,
} from "@/lib/noticeboard";
import { getSupabaseBrowserClient } from "@/lib/supabase/client";

type FormState = {
  title: string;
  tag: string;
  body: string;
  image_url: string | null;
  image_path: string | null;
};

const initialFormState: FormState = {
  title: "",
  tag: "",
  body: "",
  image_url: null,
  image_path: null,
};

const formattingActions = [
  { label: "H2", syntax: "## Heading" },
  { label: "Bold", syntax: "**bold text**" },
  { label: "Italic", syntax: "*italic text*" },
  { label: "Bullet", syntax: "- list item" },
  { label: "Link", syntax: "[link text](https://example.com)" },
] as const;

export function AdminNoticeboardManager() {
  const textareaRef = useRef<HTMLTextAreaElement | null>(null);
  const [posts, setPosts] = useState<NoticeboardPost[]>([]);
  const [form, setForm] = useState<FormState>(initialFormState);
  const [editingPostId, setEditingPostId] = useState<string | null>(null);
  const [selectedImage, setSelectedImage] = useState<File | null>(null);
  const [previewImageUrl, setPreviewImageUrl] = useState<string | null>(null);
  const [removeExistingImage, setRemoveExistingImage] = useState(false);
  const [postSearchQuery, setPostSearchQuery] = useState("");
  const debouncedPostSearchQuery = useDebouncedValue(
    postSearchQuery,
    GLOBAL_SEARCH_DEBOUNCE_MS,
  );
  const [isSearchingPosts, setIsSearchingPosts] = useState(false);
  const [searchError, setSearchError] = useState<string | null>(null);
  const [feedbackMessage, setFeedbackMessage] = useState<{
    tone: "success" | "error";
    text: string;
  } | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isPending, startTransition] = useTransition();

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
          setFeedbackMessage({
            tone: "error",
            text: error.message,
          });
          return;
        }

        setPosts(data ?? []);
      } catch (error) {
        if (isMounted) {
          setFeedbackMessage({
            tone: "error",
            text:
              error instanceof Error
                ? error.message
                : "Could not load noticeboard posts.",
          });
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
    let isMounted = true;

    async function loadPostsForQuery() {
      try {
        setSearchError(null);
        setIsSearchingPosts(true);
        const supabase = getSupabaseBrowserClient();
        const trimmedQuery = debouncedPostSearchQuery.trim();
        const { data, error } =
          trimmedQuery.length >= MIN_GLOBAL_SEARCH_QUERY_LENGTH
            ? await supabase.rpc("search_noticeboard_posts_admin", {
                p_query: trimmedQuery,
              })
            : await supabase.rpc("get_noticeboard_posts");

        if (!isMounted) {
          return;
        }

        if (error) {
          setSearchError(error.message);
          return;
        }

        setPosts(data ?? []);
      } catch (error) {
        if (isMounted) {
          setSearchError(
            error instanceof Error
              ? error.message
              : "Could not load noticeboard posts.",
          );
        }
      } finally {
        if (isMounted) {
          setIsSearchingPosts(false);
        }
      }
    }

    if (!isLoading && !(debouncedPostSearchQuery.trim().length > 0 &&
      debouncedPostSearchQuery.trim().length < MIN_GLOBAL_SEARCH_QUERY_LENGTH)) {
      void loadPostsForQuery();
    }

    return () => {
      isMounted = false;
    };
  }, [debouncedPostSearchQuery, isLoading]);

  useEffect(() => {
    return () => {
      if (previewImageUrl) {
        URL.revokeObjectURL(previewImageUrl);
      }
    };
  }, [previewImageUrl]);

  function resetForm(options?: { keepFeedback?: boolean }) {
    if (previewImageUrl) {
      URL.revokeObjectURL(previewImageUrl);
    }
    setForm(initialFormState);
    setEditingPostId(null);
    setSelectedImage(null);
    setPreviewImageUrl(null);
    setRemoveExistingImage(false);
    if (!options?.keepFeedback) {
      setFeedbackMessage(null);
    }
  }

  function handleFormattingInsert(syntax: string) {
    const textarea = textareaRef.current;

    if (!textarea) {
      setForm((current) => ({
        ...current,
        body: current.body ? `${current.body}\n${syntax}` : syntax,
      }));
      return;
    }

    const start = textarea.selectionStart;
    const end = textarea.selectionEnd;
    const selected = form.body.slice(start, end);
    const nextBody =
      form.body.slice(0, start) +
      (selected ? syntax.replace(/text|item|Heading/, selected) : syntax) +
      form.body.slice(end);

    setForm((current) => ({
      ...current,
      body: nextBody,
    }));

    requestAnimationFrame(() => {
      textarea.focus();
      const cursor = start + syntax.length;
      textarea.setSelectionRange(cursor, cursor);
    });
  }

  function startEditing(post: NoticeboardPost) {
    setEditingPostId(post.id);
    setForm({
      title: post.title,
      tag: post.tag ?? "",
      body: post.body,
      image_url: post.image_url,
      image_path: post.image_path,
    });
    setSelectedImage(null);
    if (previewImageUrl) {
      URL.revokeObjectURL(previewImageUrl);
    }
    setPreviewImageUrl(null);
    setRemoveExistingImage(false);
    setFeedbackMessage(null);
  }

  function handleImageChange(event: React.ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0] ?? null;

    if (!file) {
      if (previewImageUrl) {
        URL.revokeObjectURL(previewImageUrl);
      }
      setSelectedImage(null);
      setPreviewImageUrl(null);
      return;
    }

    if (file.size > NOTICEBOARD_IMAGE_MAX_BYTES) {
      setFeedbackMessage({
        tone: "error",
        text: "Image files must be 2MB or smaller.",
      });
      event.target.value = "";
      return;
    }

    if (
      !NOTICEBOARD_IMAGE_ACCEPTED_TYPES.includes(
        file.type as (typeof NOTICEBOARD_IMAGE_ACCEPTED_TYPES)[number],
      )
    ) {
      setFeedbackMessage({
        tone: "error",
        text: "Only PNG, JPG, WebP, and non-animated GIF images are supported.",
      });
      event.target.value = "";
      return;
    }

    if (previewImageUrl) {
      URL.revokeObjectURL(previewImageUrl);
    }

    setSelectedImage(file);
    setPreviewImageUrl(URL.createObjectURL(file));
    setRemoveExistingImage(false);
    setFeedbackMessage(null);
  }

  function handleSubmit() {
    startTransition(async () => {
      setFeedbackMessage(null);

      if (!form.title.trim() || !form.body.trim()) {
        setFeedbackMessage({
          tone: "error",
          text: "Title and notice text are required.",
        });
        return;
      }

      try {
        const supabase = getSupabaseBrowserClient();
        const {
          data: { session },
        } = await supabase.auth.getSession();

        if (!session?.access_token) {
          setFeedbackMessage({
            tone: "error",
            text: "You must be signed in to manage noticeboard posts.",
          });
          return;
        }

        const formData = new FormData();
        formData.append("title", form.title.trim());
        formData.append("body", form.body.trim());
        formData.append("tag", form.tag.trim());
        formData.append("post_id", editingPostId ?? "");
        formData.append("remove_existing_image", removeExistingImage ? "true" : "false");

        if (selectedImage) {
          formData.append("image", selectedImage);
        }

        const response = await fetch("/api/admin/noticeboard", {
          method: "POST",
          headers: {
            Authorization: `Bearer ${session.access_token}`,
          },
          body: formData,
        });
        const payload = (await response.json()) as {
          error?: string;
          message?: string;
          post?: NoticeboardPost;
        };

        if (!response.ok || !payload.post) {
          throw new Error(payload.error ?? "Could not save the noticeboard post.");
        }

        setPosts((current) => [
          payload.post as NoticeboardPost,
          ...current.filter((post) => post.id !== (payload.post as NoticeboardPost).id),
        ]);
        setFeedbackMessage({
          tone: "success",
          text: payload.message ?? "Noticeboard post saved.",
        });

        resetForm({ keepFeedback: true });
        window.dispatchEvent(new CustomEvent("noticeboard-updated"));
      } catch (error) {
        setFeedbackMessage({
          tone: "error",
          text:
            error instanceof Error
              ? error.message
              : "Could not save the noticeboard post.",
        });
      }
    });
  }

  function handleDelete(post: NoticeboardPost) {
    startTransition(async () => {
      setFeedbackMessage(null);

      try {
        const supabase = getSupabaseBrowserClient();
        const {
          data: { session },
        } = await supabase.auth.getSession();

        if (!session?.access_token) {
          setFeedbackMessage({
            tone: "error",
            text: "You must be signed in to manage noticeboard posts.",
          });
          return;
        }

        const response = await fetch("/api/admin/noticeboard", {
          method: "DELETE",
          headers: {
            Authorization: `Bearer ${session.access_token}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            post_id: post.id,
          }),
        });
        const payload = (await response.json()) as {
          error?: string;
        };

        if (!response.ok) {
          throw new Error(payload.error ?? "Could not delete the noticeboard post.");
        }

        setPosts((current) => current.filter((item) => item.id !== post.id));
        if (editingPostId === post.id) {
          resetForm();
        }
        setFeedbackMessage({
          tone: "success",
          text: "Noticeboard post deleted.",
        });
        window.dispatchEvent(new CustomEvent("noticeboard-updated"));
      } catch (error) {
        setFeedbackMessage({
          tone: "error",
          text:
            error instanceof Error
              ? error.message
              : "Could not delete the noticeboard post.",
        });
      }
    });
  }

  return (
    <div className="space-y-6">
      <div className="grid gap-6 xl:grid-cols-[1.05fr_0.95fr]">
        <div className="space-y-4 rounded-[24px] border border-fuchsia-500/15 bg-[linear-gradient(180deg,rgba(16,11,31,0.88),rgba(8,7,18,0.74))] p-5">
          <div className="flex items-center justify-between gap-3">
            <div>
              <p className="text-sm uppercase tracking-[0.3em] text-zinc-500">
                {editingPostId ? "Edit Post" : "Create Post"}
              </p>
              <p className="mt-2 text-xl font-semibold text-white">
                Noticeboard Editor
              </p>
            </div>
            {editingPostId ? (
              <button
                type="button"
                onClick={() => resetForm()}
                className="rounded-2xl border border-fuchsia-500/15 bg-[rgba(20,15,36,0.72)] px-4 py-2 text-sm font-semibold text-white transition hover:bg-white/10"
              >
                Cancel Edit
              </button>
            ) : null}
          </div>

          <label className="block">
            <span className="mb-2 block text-sm font-medium text-zinc-200">Title</span>
            <input
              value={form.title}
              onChange={(event) =>
                setForm((current) => ({ ...current, title: event.target.value }))
              }
              className="min-h-12 w-full rounded-2xl border border-cyan-500/15 bg-[linear-gradient(180deg,rgba(18,12,35,0.92),rgba(8,8,20,0.76))] px-4 text-white outline-none transition focus:border-fuchsia-400/60 focus:shadow-[0_0_0_1px_rgba(255,45,166,0.24)]"
            />
          </label>

          <label className="block">
            <span className="mb-2 block text-sm font-medium text-zinc-200">Tag</span>
            <input
              value={form.tag}
              onChange={(event) =>
                setForm((current) => ({ ...current, tag: event.target.value }))
              }
              className="min-h-12 w-full rounded-2xl border border-cyan-500/15 bg-[linear-gradient(180deg,rgba(18,12,35,0.92),rgba(8,8,20,0.76))] px-4 text-white outline-none transition focus:border-fuchsia-400/60 focus:shadow-[0_0_0_1px_rgba(255,45,166,0.24)]"
            />
          </label>

          <div className="flex flex-wrap gap-2">
            {formattingActions.map((action) => (
              <button
                key={action.label}
                type="button"
                onClick={() => handleFormattingInsert(action.syntax)}
                className="rounded-2xl border border-fuchsia-500/15 bg-[rgba(20,15,36,0.72)] px-3 py-2 text-xs font-semibold uppercase tracking-[0.14em] text-white transition hover:bg-white/10"
              >
                {action.label}
              </button>
            ))}
          </div>

          <label className="block">
            <span className="mb-2 block text-sm font-medium text-zinc-200">
              Notice Text
            </span>
            <textarea
              ref={textareaRef}
              rows={10}
              value={form.body}
              onChange={(event) =>
                setForm((current) => ({ ...current, body: event.target.value }))
              }
              className="w-full rounded-2xl border border-cyan-500/15 bg-[linear-gradient(180deg,rgba(18,12,35,0.92),rgba(8,8,20,0.76))] px-4 py-3 text-white outline-none transition focus:border-fuchsia-400/60 focus:shadow-[0_0_0_1px_rgba(255,45,166,0.24)]"
              placeholder="Write your post here. Markdown formatting is supported."
            />
          </label>

          <label className="block">
            <span className="mb-2 block text-sm font-medium text-zinc-200">
              Image Upload
            </span>
            <input
              type="file"
              accept="image/png,image/jpeg,image/webp,image/gif"
              onChange={handleImageChange}
              className="block w-full text-sm text-zinc-300 file:mr-4 file:rounded-2xl file:border-0 file:bg-[linear-gradient(90deg,var(--brand-start),var(--brand-mid),var(--brand-end))] file:px-4 file:py-2 file:font-semibold file:text-white hover:file:brightness-110"
            />
            <p className="mt-2 text-sm leading-6 text-zinc-400">
              Optional. Max image size is 2MB.
            </p>
          </label>

          {(form.image_url || previewImageUrl) && !selectedImage ? (
            <button
              type="button"
              onClick={() => {
                setRemoveExistingImage(true);
                setForm((current) => ({
                  ...current,
                  image_url: null,
                  image_path: null,
                }));
              }}
              className="rounded-2xl border border-fuchsia-500/15 bg-[rgba(20,15,36,0.72)] px-4 py-2 text-sm font-semibold text-white transition hover:bg-white/10"
            >
              Remove Current Image
            </button>
          ) : null}

          {feedbackMessage ? (
            <div
              className={`rounded-2xl border px-4 py-3 text-sm leading-6 ${
                feedbackMessage.tone === "success"
                  ? "border-emerald-400/30 bg-emerald-400/10 text-emerald-100"
                  : "border-rose-400/30 bg-rose-400/10 text-rose-100"
              }`}
            >
              {feedbackMessage.text}
            </div>
          ) : null}

          <button
            type="button"
            onClick={handleSubmit}
            disabled={isPending}
            className="min-h-12 rounded-2xl bg-[linear-gradient(90deg,var(--brand-start),var(--brand-mid),var(--brand-end))] px-5 py-3 text-sm font-bold uppercase tracking-[0.12em] text-white transition hover:brightness-110 disabled:cursor-not-allowed disabled:opacity-70"
          >
            {isPending
              ? editingPostId
                ? "Saving..."
                : "Publishing..."
              : editingPostId
                ? "Save Noticeboard Post"
                : "Publish Noticeboard Post"}
          </button>
        </div>

        <div className="rounded-[24px] border border-fuchsia-500/15 bg-[linear-gradient(180deg,rgba(16,11,31,0.88),rgba(8,7,18,0.74))] p-5">
          <p className="text-sm uppercase tracking-[0.3em] text-zinc-500">Preview</p>
          <p className="mt-2 text-xl font-semibold text-white">
            {form.title || "Noticeboard preview"}
          </p>
          {form.tag ? (
            <div className="mt-3">
              <StatusPill tone="neutral">{form.tag}</StatusPill>
            </div>
          ) : null}
          {previewImageUrl || form.image_url ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={previewImageUrl ?? form.image_url ?? undefined}
              alt={form.title || "Noticeboard preview image"}
              className="mt-4 max-h-80 w-full rounded-[22px] border border-white/10 object-cover"
            />
          ) : null}
          <div className="mt-4">
            <NoticeboardMarkdown content={form.body || "Start writing to preview your post here."} />
          </div>
        </div>
      </div>

      <div className="space-y-4">
        <p className="text-sm uppercase tracking-[0.3em] text-zinc-500">Existing Posts</p>
        <PanelSearchInput
          label="Search noticeboard posts"
          placeholder="Search by title, content, status, or date"
          value={postSearchQuery}
          onChange={setPostSearchQuery}
        />
        {postSearchQuery.trim().length > 0 &&
        postSearchQuery.trim().length < MIN_GLOBAL_SEARCH_QUERY_LENGTH ? (
          <div className="rounded-[24px] border border-dashed border-white/10 bg-white/[0.03] p-5 text-sm leading-7 text-zinc-300">
            Type at least {MIN_GLOBAL_SEARCH_QUERY_LENGTH} characters to search
            noticeboard posts.
          </div>
        ) : null}
        {isLoading ? (
          <div className="rounded-[24px] border border-fuchsia-500/15 bg-[linear-gradient(180deg,rgba(16,11,31,0.88),rgba(8,7,18,0.74))] p-5 text-sm leading-7 text-zinc-300">
            Loading noticeboard posts...
          </div>
        ) : searchError ? (
          <div className="rounded-[24px] border border-rose-400/30 bg-rose-400/10 p-5 text-sm leading-7 text-rose-100">
            {searchError}
          </div>
        ) : isSearchingPosts ? (
          <div className="rounded-[24px] border border-fuchsia-500/15 bg-[linear-gradient(180deg,rgba(16,11,31,0.88),rgba(8,7,18,0.74))] p-5 text-sm leading-7 text-zinc-300">
            Searching noticeboard posts...
          </div>
        ) : posts.length > 0 ? (
          posts.map((post) => (
            <article
              key={post.id}
              className="rounded-[24px] border border-fuchsia-500/15 bg-[linear-gradient(180deg,rgba(16,11,31,0.88),rgba(8,7,18,0.74))] p-5"
            >
              <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                <div>
                  <div className="flex flex-wrap gap-2">
                    {post.tag ? <StatusPill tone="neutral">{post.tag}</StatusPill> : null}
                    <StatusPill tone="neutral">
                      {formatNoticeboardDate(post.posted_at)}
                    </StatusPill>
                  </div>
                  <p className="mt-3 text-xl font-semibold text-white">{post.title}</p>
                </div>
                <div className="flex flex-wrap gap-3">
                  <button
                    type="button"
                    onClick={() => startEditing(post)}
                    className="rounded-2xl border border-fuchsia-500/15 bg-[rgba(20,15,36,0.72)] px-4 py-2 text-sm font-semibold text-white transition hover:bg-white/10"
                  >
                    Edit
                  </button>
                  <button
                    type="button"
                    disabled={isPending}
                    onClick={() => handleDelete(post)}
                    className="rounded-2xl border border-rose-400/30 bg-rose-400/10 px-4 py-2 text-sm font-semibold text-rose-100 transition hover:bg-rose-400/20 disabled:cursor-not-allowed disabled:opacity-70"
                  >
                    Delete
                  </button>
                </div>
              </div>

              {post.image_url ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={post.image_url}
                  alt={post.title}
                  className="mt-4 max-h-64 w-full rounded-[22px] border border-white/10 object-cover"
                />
              ) : null}

              <div className="mt-4">
                <NoticeboardMarkdown content={post.body} />
              </div>
            </article>
          ))
        ) : postSearchQuery.trim().length >= MIN_GLOBAL_SEARCH_QUERY_LENGTH ? (
          <div className="rounded-[24px] border border-dashed border-white/10 bg-white/[0.03] p-5 text-sm leading-7 text-zinc-300">
            No noticeboard posts match that search.
          </div>
        ) : (
          <div className="rounded-[24px] border border-dashed border-white/10 bg-white/[0.03] p-5 text-sm leading-7 text-zinc-300">
            No noticeboard posts have been created yet.
          </div>
        )}
      </div>
    </div>
  );
}
