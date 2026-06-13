"use client";

import { useEffect, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { hostAccounts, resolveAccountRole } from "@/lib/auth/roles";
import { LegalLinks } from "@/components/legal/legal-links";
import { getSupabaseBrowserClient } from "@/lib/supabase/client";
import { useAuth } from "@/components/providers/auth-provider";
import { PageIntro } from "@/components/ui/page-intro";
import { SectionCard } from "@/components/ui/section-card";
import { StatusPill } from "@/components/ui/status-pill";

type AuthMode = "sign-in" | "sign-up";

type AuthMessage =
  | {
      type: "success" | "error";
      text: string;
    }
  | null;

export function AccountSpace() {
  const router = useRouter();
  const { isAdmin, isLoading, role, user } = useAuth();
  const [mode, setMode] = useState<AuthMode>("sign-in");
  const [displayName, setDisplayName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [isRecoveryMode, setIsRecoveryMode] = useState(false);
  const [message, setMessage] = useState<AuthMessage>(null);
  const [isPending, startTransition] = useTransition();
  const [settingsMessage, setSettingsMessage] = useState<AuthMessage>(null);
  const [deleteConfirmation, setDeleteConfirmation] = useState("");
  const [deleteMessage, setDeleteMessage] = useState<AuthMessage>(null);
  const [isSettingsPending, startSettingsTransition] = useTransition();
  const [isDeletePending, startDeleteTransition] = useTransition();

  useEffect(() => {
    const supabase = getSupabaseBrowserClient();

    const suspendedNotice = window.sessionStorage.getItem("auth_notice");
    if (suspendedNotice) {
      window.requestAnimationFrame(() => {
        setMessage({
          type: "error",
          text: suspendedNotice,
        });
      });
      window.sessionStorage.removeItem("auth_notice");
    }

    function syncRecoveryStateFromHash() {
      const hashParams = new URLSearchParams(window.location.hash.slice(1));
      const isRecoveryHash = hashParams.get("type") === "recovery";

      if (!isRecoveryHash) {
        return;
      }

      setIsRecoveryMode(true);
      setMode("sign-in");
      setMessage({
        type: "success",
        text: "Recovery link received. Sign in state is being restored so you can set a new password.",
      });

      window.history.replaceState(
        null,
        "",
        `${window.location.pathname}${window.location.search}`,
      );
    }

    syncRecoveryStateFromHash();

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((event) => {
      if (event === "PASSWORD_RECOVERY") {
        setIsRecoveryMode(true);
        setMode("sign-in");
        setSettingsMessage({
          type: "success",
          text: "Set your new password below to finish account recovery.",
        });
      }
    });

    return () => {
      subscription.unsubscribe();
    };
  }, []);

  async function handleSignOut() {
    const supabase = getSupabaseBrowserClient();
    await supabase.auth.signOut();
    setMessage({
      type: "success",
      text: "Signed out successfully.",
    });
  }

  function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();

    startTransition(async () => {
      setMessage(null);
      const supabase = getSupabaseBrowserClient();

      if (mode === "sign-up") {
        const { error } = await supabase.auth.signUp({
          email,
          password,
          options: {
            data: {
              display_name: displayName,
            },
          },
        });

        if (error) {
          setMessage({ type: "error", text: error.message });
          return;
        }

        setMessage({
          type: "success",
          text: "In order to complete account creation please confirm your email via the message sent to your inbox - Auth powered by Supabase.",
        });
        return;
      }

      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (error) {
        setMessage({ type: "error", text: error.message });
        return;
      }

      const { data: profileData } = await supabase
        .from("user_profiles")
        .select("account_status")
        .eq("auth_user_id", data.user.id)
        .maybeSingle();

      if (profileData?.account_status === "suspended") {
        await supabase.auth.signOut();
        setMessage({
          type: "error",
          text: "Your account is suspended. Contact the host/admin if you think this is a mistake.",
        });
        return;
      }

      const resolvedRole = resolveAccountRole(data.user?.email);
      setMessage({
        type: "success",
        text:
          resolvedRole === "admin"
            ? "Signed in. Redirecting to Admin..."
            : "Signed in. Redirecting to your dashboard...",
      });

      router.replace(resolvedRole === "admin" ? "/admin" : "/dashboard");
    });
  }

  function handleForgotPassword() {
    startTransition(async () => {
      setMessage(null);

      if (!email.trim()) {
        setMessage({
          type: "error",
          text: "Enter your email address first so the reset link knows where to go.",
        });
        return;
      }

      const supabase = getSupabaseBrowserClient();
      const { error } = await supabase.auth.resetPasswordForEmail(email.trim(), {
        redirectTo: `${window.location.origin}/account`,
      });

      if (error) {
        setMessage({
          type: "error",
          text: error.message,
        });
        return;
      }

      setMessage({
        type: "success",
        text: "Password reset email sent. Open the link from your inbox to set a new password.",
      });
    });
  }

  function handleAccountUpdate(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = event.currentTarget;
    const formData = new FormData(form);
    const nextDisplayName = String(formData.get("display_name") ?? "").trim();
    const nextPassword = String(formData.get("new_password") ?? "").trim();

    startSettingsTransition(async () => {
      setSettingsMessage(null);
      const supabase = getSupabaseBrowserClient();

      const updatePayload: {
        data?: {
          display_name: string;
        };
        password?: string;
      } = {};

      if (nextDisplayName) {
        updatePayload.data = {
          display_name: nextDisplayName,
        };
      }

      if (nextPassword) {
        updatePayload.password = nextPassword;
      }

      if (isRecoveryMode && !updatePayload.password) {
        setSettingsMessage({
          type: "error",
          text: "Enter a new password to complete the recovery flow.",
        });
        return;
      }

      if (!updatePayload.data && !updatePayload.password) {
        setSettingsMessage({
          type: "error",
          text: "Add a new display name or password change before saving.",
        });
        return;
      }

      const { error } = await supabase.auth.updateUser(updatePayload);

      if (error) {
        setSettingsMessage({
          type: "error",
          text: error.message,
        });
        return;
      }

      if (nextDisplayName) {
        const { error: profileError } = await supabase.rpc(
          "update_own_profile_display_name",
          {
            p_display_name: nextDisplayName,
          },
        );

        if (profileError) {
          setSettingsMessage({
            type: "error",
            text: profileError.message,
          });
          return;
        }
      }

      form.reset();
      setIsRecoveryMode(false);
      setSettingsMessage({
        type: "success",
        text: nextPassword ? "Password updated successfully." : "Account details updated.",
      });
    });
  }

  function handleDeleteAccount() {
    startDeleteTransition(async () => {
      setDeleteMessage(null);

      if (deleteConfirmation.trim().toUpperCase() !== "DELETE") {
        setDeleteMessage({
          type: "error",
          text: 'Type "DELETE" to confirm account removal.',
        });
        return;
      }

      const supabase = getSupabaseBrowserClient();
      const {
        data: { session },
      } = await supabase.auth.getSession();

      if (!session?.access_token) {
        setDeleteMessage({
          type: "error",
          text: "Your session could not be verified for account deletion.",
        });
        return;
      }

      const response = await fetch("/api/account/delete", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${session.access_token}`,
        },
      });

      const result = (await response.json()) as {
        error?: string;
      };

      if (!response.ok) {
        setDeleteMessage({
          type: "error",
          text: result.error ?? "Could not delete the account.",
        });
        return;
      }

      await supabase.auth.signOut();
      router.replace("/");
    });
  }

  if (isLoading) {
    return (
      <div className="space-y-6">
        <PageIntro
          eyebrow="Account"
          title="Checking Session"
          description="Loading your current auth status..."
        />
      </div>
    );
  }

  if (user && role) {
    return (
      <div className="space-y-6">
        <PageIntro
          eyebrow="Account"
          title="Account Space"
          description="Manage your account details and access."
        />

        <div className="grid gap-6 lg:grid-cols-[1fr_1fr]">
          <SectionCard title="Your Account">
            <div className="space-y-4">
              <StatusPill tone={isAdmin ? "accent" : "success"}>
                {isAdmin ? "Admin / Host" : "Signed In"}
              </StatusPill>
              <div className="rounded-[22px] border border-white/10 bg-white/[0.03] p-4 text-sm leading-7 text-zinc-300">
                <p>Email: {user.email}</p>
                <p>Name: {String(user.user_metadata.display_name ?? "Not set")}</p>
                <p>Account type: {isAdmin ? "Host / Admin" : "User"}</p>
                <p>User ID: {user.id}</p>
              </div>
              <button
                type="button"
                onClick={handleSignOut}
                className="min-h-12 rounded-2xl border border-white/10 bg-white/5 px-5 py-3 text-sm font-bold uppercase tracking-[0.12em] text-white transition hover:bg-white/10"
              >
                Sign Out
              </button>
            </div>
          </SectionCard>
        </div>

        <div className="grid gap-6 lg:grid-cols-[1fr_1fr]">
          <SectionCard
            title="Account Settings"
            description={
              isRecoveryMode
                ? "Finish your password reset here."
                : "Update your display name here, or change your password. Authentication powered by Supabase."
            }
          >
            <form className="space-y-4" onSubmit={handleAccountUpdate}>
              {isRecoveryMode ? (
                <div className="rounded-2xl border border-amber-300/30 bg-amber-300/10 px-4 py-3 text-sm leading-6 text-amber-100">
                  Password recovery is active. Add a new password below to complete the reset.
                </div>
              ) : null}

              <label className="block">
                <span className="mb-2 block text-sm font-medium text-zinc-200">
                  Display name
                </span>
                <input
                  name="display_name"
                  defaultValue={String(user.user_metadata.display_name ?? "")}
                  className="min-h-12 w-full rounded-2xl border border-white/10 bg-white/[0.04] px-4 text-white outline-none transition focus:border-amber-300/60"
                />
              </label>

              <label className="block">
                <span className="mb-2 block text-sm font-medium text-zinc-200">
                  New password
                </span>
                <input
                  name="new_password"
                  type="password"
                  className="min-h-12 w-full rounded-2xl border border-white/10 bg-white/[0.04] px-4 text-white outline-none transition focus:border-amber-300/60"
                />
              </label>

              {settingsMessage ? (
                <div
                  className={`rounded-2xl border px-4 py-3 text-sm leading-6 ${
                    settingsMessage.type === "success"
                      ? "border-emerald-400/30 bg-emerald-400/10 text-emerald-100"
                      : "border-rose-400/30 bg-rose-400/10 text-rose-100"
                  }`}
                >
                  {settingsMessage.text}
                </div>
              ) : null}

              <button
                type="submit"
                disabled={isSettingsPending}
                className="min-h-12 rounded-2xl bg-amber-300 px-5 py-3 text-sm font-bold uppercase tracking-[0.12em] text-black transition hover:bg-amber-200 disabled:cursor-not-allowed disabled:opacity-70"
              >
                {isSettingsPending
                  ? "Saving..."
                  : isRecoveryMode
                    ? "Save New Password"
                    : "Save Account Changes"}
              </button>
            </form>
          </SectionCard>

          <SectionCard
            title="Delete Account"
            description="This removes your login account and any personal data, but past show history, archived track lists, and TOTN records stay retained."
          >
            <div className="space-y-4">
              <label className="block">
                <span className="mb-2 block text-sm font-medium text-zinc-200">
                  Type DELETE to confirm
                </span>
                <input
                  value={deleteConfirmation}
                  onChange={(event) => setDeleteConfirmation(event.target.value)}
                  className="min-h-12 w-full rounded-2xl border border-white/10 bg-white/[0.04] px-4 text-white outline-none transition focus:border-rose-400/60"
                />
              </label>

              {deleteMessage ? (
                <div
                  className={`rounded-2xl border px-4 py-3 text-sm leading-6 ${
                    deleteMessage.type === "success"
                      ? "border-emerald-400/30 bg-emerald-400/10 text-emerald-100"
                      : "border-rose-400/30 bg-rose-400/10 text-rose-100"
                  }`}
                >
                  {deleteMessage.text}
                </div>
              ) : null}

              <button
                type="button"
                onClick={handleDeleteAccount}
                disabled={isDeletePending}
                className="min-h-12 rounded-2xl border border-rose-400/30 bg-rose-400/10 px-5 py-3 text-sm font-bold uppercase tracking-[0.12em] text-rose-100 transition hover:bg-rose-400/20 disabled:cursor-not-allowed disabled:opacity-70"
              >
                {isDeletePending ? "Deleting..." : "Delete Account"}
              </button>
            </div>
          </SectionCard>
        </div>

        <LegalLinks />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <PageIntro
        eyebrow="Account"
        title="Account Space"
        description="Sign in or create your account."
      />

      <div className="grid gap-6 lg:grid-cols-[1.05fr_0.95fr]">
        <SectionCard
          title={mode === "sign-in" ? "Sign In" : "Create Account"}
          description={
            mode === "sign-in"
              ? "Sign in to your account or reset your password."
              : "Create a new account with email and password."
          }
        >
          <div className="mb-4 flex gap-3">
            <button
              type="button"
              onClick={() => setMode("sign-in")}
              className={`rounded-2xl px-4 py-2 text-sm font-semibold transition ${
                mode === "sign-in"
                  ? "bg-amber-300 text-black"
                  : "border border-white/10 bg-white/5 text-white"
              }`}
            >
              Sign In
            </button>
            <button
              type="button"
              onClick={() => setMode("sign-up")}
              className={`rounded-2xl px-4 py-2 text-sm font-semibold transition ${
                mode === "sign-up"
                  ? "bg-amber-300 text-black"
                  : "border border-white/10 bg-white/5 text-white"
              }`}
            >
              Create User
            </button>
          </div>

          <form className="space-y-4" onSubmit={handleSubmit}>
            {mode === "sign-up" ? (
              <label className="block">
                <span className="mb-2 block text-sm font-medium text-zinc-200">
                  User name
                </span>
                <input
                  required
                  value={displayName}
                  onChange={(event) => setDisplayName(event.target.value)}
                  className="min-h-12 w-full rounded-2xl border border-white/10 bg-white/[0.04] px-4 text-white outline-none transition focus:border-amber-300/60"
                />
              </label>
            ) : null}

            <label className="block">
              <span className="mb-2 block text-sm font-medium text-zinc-200">
                Email
              </span>
              <input
                required
                type="email"
                value={email}
                onChange={(event) => setEmail(event.target.value)}
                className="min-h-12 w-full rounded-2xl border border-white/10 bg-white/[0.04] px-4 text-white outline-none transition focus:border-amber-300/60"
              />
            </label>

            <label className="block">
              <span className="mb-2 block text-sm font-medium text-zinc-200">
                Password
              </span>
              <input
                required
                type="password"
                value={password}
                onChange={(event) => setPassword(event.target.value)}
                className="min-h-12 w-full rounded-2xl border border-white/10 bg-white/[0.04] px-4 text-white outline-none transition focus:border-amber-300/60"
              />
            </label>

            {message ? (
              <div
                className={`rounded-2xl border px-4 py-3 text-sm leading-6 ${
                  message.type === "success"
                    ? "border-emerald-400/30 bg-emerald-400/10 text-emerald-100"
                    : "border-rose-400/30 bg-rose-400/10 text-rose-100"
                }`}
              >
                {message.text}
              </div>
            ) : null}

            <button
              type="submit"
              disabled={isPending}
              className="min-h-12 rounded-2xl bg-amber-300 px-5 py-3 text-sm font-bold uppercase tracking-[0.12em] text-black transition hover:bg-amber-200 disabled:cursor-not-allowed disabled:opacity-70"
            >
              {isPending
                ? "Working..."
                : mode === "sign-in"
                  ? "Sign In"
                  : "Create User"}
            </button>

            {mode === "sign-in" ? (
              <button
                type="button"
                onClick={handleForgotPassword}
                disabled={isPending}
                className="min-h-12 w-full rounded-2xl border border-white/10 bg-white/5 px-5 py-3 text-sm font-bold uppercase tracking-[0.12em] text-white transition hover:bg-white/10 disabled:cursor-not-allowed disabled:opacity-70"
              >
                Forgot Password
              </button>
            ) : null}
          </form>
        </SectionCard>

        <SectionCard
          title="Host Access"
          description="Host/admin account details."
        >
          <div className="space-y-3">
            <div className="rounded-[22px] border border-white/10 bg-white/[0.03] p-4 text-sm leading-6 text-zinc-300">
              Host/admin access is tied to the addresses below.
            </div>
            {hostAccounts.map((account) => (
              <div
                key={account.email}
                className="rounded-[22px] border border-white/10 bg-white/[0.03] p-4 text-sm leading-6 text-zinc-300"
              >
                <div className="flex items-center justify-between gap-3">
                  <p className="font-semibold text-white">{account.label}</p>
                  <StatusPill tone="accent">admin</StatusPill>
                </div>
                <p className="mt-2 break-all">{account.email}</p>
              </div>
            ))}
          </div>
        </SectionCard>
      </div>

      <LegalLinks />
    </div>
  );
}
