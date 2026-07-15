"use client";

import { useEffect, useState, useTransition } from "react";
import { useAuth } from "@/components/providers/auth-provider";
import { PanelSearchInput } from "@/components/ui/panel-search-input";
import { StatusPill } from "@/components/ui/status-pill";
import { UserAvatar } from "@/components/ui/user-avatar";
import { useDebouncedValue } from "@/hooks/use-debounced-value";
import {
  GLOBAL_SEARCH_DEBOUNCE_MS,
  MIN_GLOBAL_SEARCH_QUERY_LENGTH,
} from "@/lib/global-search";
import {
  formatModerationActionLabel,
  formatModerationDate,
  moderationStatusTone,
  type ModerationAuditRow,
  type ModerationSubmissionRow,
  type ModerationUserRow,
} from "@/lib/moderation";
import { getSupabaseBrowserClient } from "@/lib/supabase/client";

export function AdminModerationPanel() {
  const { user } = useAuth();
  const [users, setUsers] = useState<ModerationUserRow[]>([]);
  const [submissions, setSubmissions] = useState<ModerationSubmissionRow[]>([]);
  const [auditLog, setAuditLog] = useState<ModerationAuditRow[]>([]);
  const [userSearchQuery, setUserSearchQuery] = useState("");
  const [submissionSearchQuery, setSubmissionSearchQuery] = useState("");
  const debouncedUserSearchQuery = useDebouncedValue(
    userSearchQuery,
    GLOBAL_SEARCH_DEBOUNCE_MS,
  );
  const debouncedSubmissionSearchQuery = useDebouncedValue(
    submissionSearchQuery,
    GLOBAL_SEARCH_DEBOUNCE_MS,
  );
  const [isUsersLoading, setIsUsersLoading] = useState(true);
  const [isSubmissionsLoading, setIsSubmissionsLoading] = useState(true);
  const [isAuditLoading, setIsAuditLoading] = useState(true);
  const [usersError, setUsersError] = useState<string | null>(null);
  const [submissionsError, setSubmissionsError] = useState<string | null>(null);
  const [auditError, setAuditError] = useState<string | null>(null);
  const [feedbackMessage, setFeedbackMessage] = useState<{
    tone: "success" | "error";
    text: string;
  } | null>(null);
  const [isPending, startTransition] = useTransition();

  async function loadAuditLog() {
    const supabase = getSupabaseBrowserClient();
    const { data, error } = await supabase.rpc("get_recent_moderation_actions");

    if (error) {
      throw new Error(error.message);
    }

    setAuditLog(data ?? []);
  }

  useEffect(() => {
    let isMounted = true;

    void (async () => {
      try {
        setUsersError(null);
        setIsUsersLoading(true);
        const supabase = getSupabaseBrowserClient();
        const { data, error } = await supabase.rpc("get_moderation_users");

        if (!isMounted) {
          return;
        }

        if (error) {
          setUsersError(error.message);
          return;
        }

        setUsers(data ?? []);
      } catch (error) {
        if (isMounted) {
          setUsersError(
            error instanceof Error ? error.message : "Could not load users.",
          );
        }
      } finally {
        if (isMounted) {
          setIsUsersLoading(false);
        }
      }
    })();

    return () => {
      isMounted = false;
    };
  }, []);

  useEffect(() => {
    let isMounted = true;

    void (async () => {
      try {
        setSubmissionsError(null);
        setIsSubmissionsLoading(true);
        const supabase = getSupabaseBrowserClient();
        const { data, error } = await supabase.rpc("get_moderation_submissions");

        if (!isMounted) {
          return;
        }

        if (error) {
          setSubmissionsError(error.message);
          return;
        }

        setSubmissions(data ?? []);
      } catch (error) {
        if (isMounted) {
          setSubmissionsError(
            error instanceof Error ? error.message : "Could not load submissions.",
          );
        }
      } finally {
        if (isMounted) {
          setIsSubmissionsLoading(false);
        }
      }
    })();

    return () => {
      isMounted = false;
    };
  }, []);

  useEffect(() => {
    let isMounted = true;

    void (async () => {
      try {
        setAuditError(null);
        setIsAuditLoading(true);
        const supabase = getSupabaseBrowserClient();
        const { data, error } = await supabase.rpc("get_recent_moderation_actions");

        if (!isMounted) {
          return;
        }

        if (error) {
          setAuditError(error.message);
          return;
        }

        setAuditLog(data ?? []);
      } catch (error) {
        if (isMounted) {
          setAuditError(
            error instanceof Error ? error.message : "Could not load audit trail.",
          );
        }
      } finally {
        if (isMounted) {
          setIsAuditLoading(false);
        }
      }
    })();

    return () => {
      isMounted = false;
    };
  }, []);

  useEffect(() => {
    let isMounted = true;

    if (
      debouncedUserSearchQuery.trim().length > 0 &&
      debouncedUserSearchQuery.trim().length < MIN_GLOBAL_SEARCH_QUERY_LENGTH
    ) {
      return;
    }

    void (async () => {
      try {
        setUsersError(null);
        setIsUsersLoading(true);
        const supabase = getSupabaseBrowserClient();
        const trimmedQuery = debouncedUserSearchQuery.trim();
        const { data, error } =
          trimmedQuery.length >= MIN_GLOBAL_SEARCH_QUERY_LENGTH
            ? await supabase.rpc("search_moderation_users", {
                p_query: trimmedQuery,
              })
            : await supabase.rpc("get_moderation_users");

        if (!isMounted) {
          return;
        }

        if (error) {
          setUsersError(error.message);
          return;
        }

        setUsers(data ?? []);
      } catch (error) {
        if (isMounted) {
          setUsersError(
            error instanceof Error ? error.message : "Could not load users.",
          );
        }
      } finally {
        if (isMounted) {
          setIsUsersLoading(false);
        }
      }
    })();

    return () => {
      isMounted = false;
    };
  }, [debouncedUserSearchQuery]);

  useEffect(() => {
    let isMounted = true;

    if (
      debouncedSubmissionSearchQuery.trim().length > 0 &&
      debouncedSubmissionSearchQuery.trim().length < MIN_GLOBAL_SEARCH_QUERY_LENGTH
    ) {
      return;
    }

    void (async () => {
      try {
        setSubmissionsError(null);
        setIsSubmissionsLoading(true);
        const supabase = getSupabaseBrowserClient();
        const trimmedQuery = debouncedSubmissionSearchQuery.trim();
        const { data, error } =
          trimmedQuery.length >= MIN_GLOBAL_SEARCH_QUERY_LENGTH
            ? await supabase.rpc("search_moderation_submissions", {
                p_query: trimmedQuery,
              })
            : await supabase.rpc("get_moderation_submissions");

        if (!isMounted) {
          return;
        }

        if (error) {
          setSubmissionsError(error.message);
          return;
        }

        setSubmissions(data ?? []);
      } catch (error) {
        if (isMounted) {
          setSubmissionsError(
            error instanceof Error ? error.message : "Could not load submissions.",
          );
        }
      } finally {
        if (isMounted) {
          setIsSubmissionsLoading(false);
        }
      }
    })();

    return () => {
      isMounted = false;
    };
  }, [debouncedSubmissionSearchQuery]);

  function handleUserStatusChange(targetUserId: string, nextStatus: "active" | "suspended") {
    startTransition(async () => {
      setFeedbackMessage(null);

      try {
        const supabase = getSupabaseBrowserClient();
        const { data, error } = await supabase.rpc("set_user_account_status", {
          p_target_user_id: targetUserId,
          p_status: nextStatus,
        });

        if (error) {
          setFeedbackMessage({
            tone: "error",
            text: error.message,
          });
          return;
        }

        setUsers((current) =>
          current.map((item) =>
            item.auth_user_id === targetUserId
              ? { ...item, account_status: data.account_status }
              : item,
          ),
        );
        await loadAuditLog();
        setFeedbackMessage({
          tone: "success",
          text:
            nextStatus === "suspended"
              ? "User suspended."
              : "User restored to active.",
        });
      } catch (error) {
        setFeedbackMessage({
          tone: "error",
          text: error instanceof Error ? error.message : "Could not update the user.",
        });
      }
    });
  }

  function handleSubmissionModeration(
    submissionId: string,
    nextStatus: "approved" | "rejected" | "removed",
  ) {
    startTransition(async () => {
      setFeedbackMessage(null);

      try {
        const supabase = getSupabaseBrowserClient();
        const { data, error } = await supabase.rpc("set_submission_moderation_status", {
          p_submission_id: submissionId,
          p_status: nextStatus,
        });

        if (error) {
          setFeedbackMessage({
            tone: "error",
            text: error.message,
          });
          return;
        }

        setSubmissions((current) =>
          current.map((item) =>
            item.submission_id === submissionId
              ? {
                  ...item,
                  moderation_status: data.moderation_status,
                }
              : item,
          ),
        );
        await loadAuditLog();
        setFeedbackMessage({
          tone: "success",
          text:
            nextStatus === "approved"
              ? "Submission restored to approved."
              : nextStatus === "rejected"
                ? "Submission rejected."
                : "Submission removed from public queues.",
        });
      } catch (error) {
        setFeedbackMessage({
          tone: "error",
          text:
            error instanceof Error
              ? error.message
              : "Could not moderate the submission.",
        });
      }
    });
  }

  return (
    <div className="space-y-6">
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

      <details className="group rounded-[24px] border border-fuchsia-500/15 bg-[linear-gradient(180deg,rgba(16,11,31,0.88),rgba(8,7,18,0.74))] p-5" open>
        <summary className="flex cursor-pointer list-none items-start justify-between gap-3">
          <div>
            <p className="text-sm uppercase tracking-[0.3em] text-zinc-500">
              User Management
            </p>
            <p className="mt-2 text-xl font-semibold text-white">Accounts</p>
          </div>
          <span className="mt-1 text-sm text-zinc-400 transition group-open:rotate-180">
            v
          </span>
        </summary>

        <div className="mt-4 space-y-4">
          <PanelSearchInput
            label="Search users"
            placeholder="Search by display name, email, or status"
            value={userSearchQuery}
            onChange={setUserSearchQuery}
          />

          <div className="max-h-[34rem] space-y-3 overflow-y-auto pr-1 [scrollbar-color:#3f3f46_#18181b] [&::-webkit-scrollbar-thumb]:rounded-full [&::-webkit-scrollbar-thumb]:bg-zinc-700 [&::-webkit-scrollbar-track]:bg-zinc-900/80 [&::-webkit-scrollbar]:w-2">
            {userSearchQuery.trim().length > 0 &&
            userSearchQuery.trim().length < MIN_GLOBAL_SEARCH_QUERY_LENGTH ? (
              <div className="rounded-[22px] border border-dashed border-white/10 bg-black/20 p-4 text-sm leading-6 text-zinc-300">
                Type at least {MIN_GLOBAL_SEARCH_QUERY_LENGTH} characters to search users.
              </div>
            ) : isUsersLoading ? (
              <div className="rounded-[22px] border border-cyan-500/15 bg-[linear-gradient(180deg,rgba(11,11,27,0.92),rgba(7,9,20,0.82))] p-4 text-sm leading-6 text-zinc-300">
                Loading users...
              </div>
            ) : usersError ? (
              <div className="rounded-[22px] border border-rose-400/30 bg-rose-400/10 p-4 text-sm leading-6 text-rose-100">
                {usersError}
              </div>
            ) : users.length > 0 ? (
              users.map((account) => {
                const isCurrentUser = account.auth_user_id === user?.id;

                return (
                  <div
                    key={account.auth_user_id}
                    className="rounded-[22px] border border-cyan-500/15 bg-[linear-gradient(180deg,rgba(11,11,27,0.92),rgba(7,9,20,0.82))] p-4"
                  >
                    <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                      <div className="flex items-start gap-3">
                        <UserAvatar
                          imageUrl={account.avatar_url}
                          name={account.display_name ?? account.email}
                          className="h-12 w-12"
                          textClassName="text-xs"
                        />
                        <div>
                          <div className="flex flex-wrap gap-2">
                            <StatusPill tone={moderationStatusTone(account.account_status)}>
                              {account.account_status}
                            </StatusPill>
                            <StatusPill tone="neutral">
                              {account.submission_count} submissions
                            </StatusPill>
                            {isCurrentUser ? (
                              <StatusPill tone="neutral">Current session</StatusPill>
                            ) : null}
                          </div>
                          <p className="mt-3 text-lg font-semibold text-white">
                            {account.display_name || "No display name"}
                          </p>
                          <p className="mt-1 break-all text-sm leading-6 text-zinc-300">
                            {account.email}
                          </p>
                          <p className="mt-1 text-sm leading-6 text-zinc-500">
                            Created {formatModerationDate(account.created_at)}
                          </p>
                        </div>
                      </div>

                      <div className="flex flex-wrap gap-3">
                        {account.account_status === "active" ? (
                          <button
                            type="button"
                            disabled={isPending || isCurrentUser}
                            onClick={() =>
                              handleUserStatusChange(account.auth_user_id, "suspended")
                            }
                            className="rounded-2xl border border-rose-400/30 bg-rose-400/10 px-4 py-2 text-sm font-semibold text-rose-100 transition hover:bg-rose-400/20 disabled:cursor-not-allowed disabled:opacity-60"
                          >
                            Suspend User
                          </button>
                        ) : (
                          <button
                            type="button"
                            disabled={isPending}
                            onClick={() =>
                              handleUserStatusChange(account.auth_user_id, "active")
                            }
                            className="rounded-2xl border border-emerald-400/30 bg-emerald-400/10 px-4 py-2 text-sm font-semibold text-emerald-100 transition hover:bg-emerald-400/20 disabled:cursor-not-allowed disabled:opacity-60"
                          >
                            Un-suspend User
                          </button>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })
            ) : (
              <div className="rounded-[22px] border border-dashed border-white/10 bg-black/20 p-4 text-sm leading-6 text-zinc-300">
                {userSearchQuery.trim().length >= MIN_GLOBAL_SEARCH_QUERY_LENGTH
                  ? "No users match that search."
                  : "No users found."}
              </div>
            )}
          </div>
        </div>
      </details>

      <details className="group rounded-[24px] border border-fuchsia-500/15 bg-[linear-gradient(180deg,rgba(16,11,31,0.88),rgba(8,7,18,0.74))] p-5" open>
        <summary className="flex cursor-pointer list-none items-start justify-between gap-3">
          <div>
            <p className="text-sm uppercase tracking-[0.3em] text-zinc-500">
              Submission Moderation
            </p>
            <p className="mt-2 text-xl font-semibold text-white">Submission Queue Control</p>
          </div>
          <span className="mt-1 text-sm text-zinc-400 transition group-open:rotate-180">
            v
          </span>
        </summary>

        <div className="mt-4 space-y-4">
          <PanelSearchInput
            label="Search submissions"
            placeholder="Search by artist, track title, or submitter"
            value={submissionSearchQuery}
            onChange={setSubmissionSearchQuery}
          />

          <div className="max-h-[34rem] space-y-3 overflow-y-auto pr-1 [scrollbar-color:#3f3f46_#18181b] [&::-webkit-scrollbar-thumb]:rounded-full [&::-webkit-scrollbar-thumb]:bg-zinc-700 [&::-webkit-scrollbar-track]:bg-zinc-900/80 [&::-webkit-scrollbar]:w-2">
            {submissionSearchQuery.trim().length > 0 &&
            submissionSearchQuery.trim().length < MIN_GLOBAL_SEARCH_QUERY_LENGTH ? (
              <div className="rounded-[22px] border border-dashed border-white/10 bg-black/20 p-4 text-sm leading-6 text-zinc-300">
                Type at least {MIN_GLOBAL_SEARCH_QUERY_LENGTH} characters to search
                submissions.
              </div>
            ) : isSubmissionsLoading ? (
              <div className="rounded-[22px] border border-cyan-500/15 bg-[linear-gradient(180deg,rgba(11,11,27,0.92),rgba(7,9,20,0.82))] p-4 text-sm leading-6 text-zinc-300">
                Loading submissions...
              </div>
            ) : submissionsError ? (
              <div className="rounded-[22px] border border-rose-400/30 bg-rose-400/10 p-4 text-sm leading-6 text-rose-100">
                {submissionsError}
              </div>
            ) : submissions.length > 0 ? (
              submissions.map((submission) => (
                <div
                  key={submission.submission_id}
                  className="rounded-[22px] border border-cyan-500/15 bg-[linear-gradient(180deg,rgba(11,11,27,0.92),rgba(7,9,20,0.82))] p-4"
                >
                  <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                    <div className="flex items-start gap-3">
                      <UserAvatar
                        imageUrl={submission.submitter_avatar_url}
                        name={submission.submitter}
                        className="h-12 w-12"
                        textClassName="text-xs"
                      />
                      <div>
                        <div className="flex flex-wrap gap-2">
                          <StatusPill tone={moderationStatusTone(submission.moderation_status)}>
                            {submission.moderation_status}
                          </StatusPill>
                          <StatusPill tone="neutral">
                            Queue:{" "}
                            {submission.queue_status === "pending"
                              ? "submitted"
                              : submission.queue_status}
                          </StatusPill>
                        </div>
                        <p className="mt-3 text-lg font-semibold text-white">
                          {submission.artist_name} - {submission.track_title}
                        </p>
                        <p className="mt-1 text-sm leading-6 text-zinc-300">
                          Submitter: {submission.submitter}
                        </p>
                        {submission.submitter_email ? (
                          <p className="mt-1 break-all text-sm leading-6 text-zinc-500">
                            {submission.submitter_email}
                          </p>
                        ) : null}
                        <p className="mt-1 text-sm leading-6 text-zinc-500">
                          Show: {submission.show_title || "Unassigned"} | Submitted{" "}
                          {formatModerationDate(submission.created_at)}
                        </p>
                      </div>
                    </div>

                    <div className="flex flex-wrap gap-3">
                      <button
                        type="button"
                        disabled={isPending || submission.moderation_status === "removed"}
                        onClick={() =>
                          handleSubmissionModeration(submission.submission_id, "removed")
                        }
                        className="rounded-2xl border border-rose-400/30 bg-rose-400/10 px-4 py-2 text-sm font-semibold text-rose-100 transition hover:bg-rose-400/20 disabled:cursor-not-allowed disabled:opacity-60"
                      >
                        Remove Submission
                      </button>
                      <button
                        type="button"
                        disabled={isPending || submission.moderation_status === "rejected"}
                        onClick={() =>
                          handleSubmissionModeration(submission.submission_id, "rejected")
                        }
                        className="rounded-2xl border border-fuchsia-500/15 bg-[rgba(20,15,36,0.72)] px-4 py-2 text-sm font-semibold text-white transition hover:bg-white/10 disabled:cursor-not-allowed disabled:opacity-60"
                      >
                        Reject Submission
                      </button>
                      <button
                        type="button"
                        disabled={isPending || submission.moderation_status === "approved"}
                        onClick={() =>
                          handleSubmissionModeration(submission.submission_id, "approved")
                        }
                        className="rounded-2xl border border-emerald-400/30 bg-emerald-400/10 px-4 py-2 text-sm font-semibold text-emerald-100 transition hover:bg-emerald-400/20 disabled:cursor-not-allowed disabled:opacity-60"
                      >
                        Restore To Approved
                      </button>
                    </div>
                  </div>
                </div>
              ))
            ) : (
              <div className="rounded-[22px] border border-dashed border-white/10 bg-black/20 p-4 text-sm leading-6 text-zinc-300">
                {submissionSearchQuery.trim().length >= MIN_GLOBAL_SEARCH_QUERY_LENGTH
                  ? "No submissions match that search."
                  : "No submissions found."}
              </div>
            )}
          </div>
        </div>
      </details>

      <details className="group rounded-[24px] border border-fuchsia-500/15 bg-[linear-gradient(180deg,rgba(16,11,31,0.88),rgba(8,7,18,0.74))] p-5">
        <summary className="flex cursor-pointer list-none items-start justify-between gap-3">
          <div>
            <p className="text-sm uppercase tracking-[0.3em] text-zinc-500">
              Audit Trail
            </p>
            <p className="mt-2 text-xl font-semibold text-white">Recent Moderation Actions</p>
          </div>
          <span className="mt-1 text-sm text-zinc-400 transition group-open:rotate-180">
            v
          </span>
        </summary>

        <div className="mt-4 space-y-4">
          {isAuditLoading ? (
            <div className="rounded-[22px] border border-cyan-500/15 bg-[linear-gradient(180deg,rgba(11,11,27,0.92),rgba(7,9,20,0.82))] p-4 text-sm leading-6 text-zinc-300">
              Loading moderation audit trail...
            </div>
          ) : auditError ? (
            <div className="rounded-[22px] border border-rose-400/30 bg-rose-400/10 p-4 text-sm leading-6 text-rose-100">
              {auditError}
            </div>
          ) : auditLog.length > 0 ? (
            <div className="space-y-3">
              {auditLog.map((entry) => (
                <div
                  key={entry.id}
                  className="rounded-[22px] border border-cyan-500/15 bg-[linear-gradient(180deg,rgba(11,11,27,0.92),rgba(7,9,20,0.82))] p-4"
                >
                  <div className="flex flex-wrap gap-2">
                    <StatusPill tone="neutral">
                      {formatModerationActionLabel(entry.action_type)}
                    </StatusPill>
                    <StatusPill tone="neutral">
                      {formatModerationDate(entry.created_at)}
                    </StatusPill>
                  </div>
                  <p className="mt-3 text-sm leading-6 text-zinc-300">
                    Moderator: {entry.moderator_name || entry.moderator_email}
                  </p>
                  <p className="mt-1 text-sm leading-6 text-zinc-500">
                    Moderator ID: {entry.moderator_user_id}
                  </p>
                  <p className="mt-1 text-sm leading-6 text-zinc-400">
                    Target: {entry.target_summary}
                  </p>
                </div>
              ))}
            </div>
          ) : (
            <div className="rounded-[22px] border border-dashed border-white/10 bg-black/20 p-4 text-sm leading-6 text-zinc-300">
              No moderation actions have been recorded yet.
            </div>
          )}
        </div>
      </details>
    </div>
  );
}
