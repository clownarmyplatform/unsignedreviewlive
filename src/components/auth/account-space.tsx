"use client";

import { useEffect, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { resolveAccountRole } from "@/lib/auth/roles";
import { LegalLinks } from "@/components/legal/legal-links";
import { getSupabaseBrowserClient } from "@/lib/supabase/client";
import { useAuth } from "@/components/providers/auth-provider";
import { UserAvatar } from "@/components/ui/user-avatar";
import {
  AVATAR_BUCKET,
  AVATAR_MAX_UPLOAD_BYTES,
  getAvatarPath,
  isSupportedAvatarType,
  processAvatarFile,
} from "@/lib/avatar";
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
  const { isAdmin, isLoading, profile, role, user } = useAuth();
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
  const [avatarBlob, setAvatarBlob] = useState<Blob | null>(null);
  const [avatarPreviewUrl, setAvatarPreviewUrl] = useState<string | null>(null);
  const [avatarMessage, setAvatarMessage] = useState<AuthMessage>(null);
  const [isAvatarPending, startAvatarTransition] = useTransition();
  const currentAvatarUrl = profile?.avatarUrl ?? null;
  const currentDisplayName =
    profile?.displayName ??
    (typeof user?.user_metadata.display_name === "string"
      ? user.user_metadata.display_name
      : null);

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

  useEffect(() => {
    return () => {
      if (avatarPreviewUrl) {
        URL.revokeObjectURL(avatarPreviewUrl);
      }
    };
  }, [avatarPreviewUrl]);

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
      if (nextDisplayName) {
        window.dispatchEvent(
          new CustomEvent("profile-updated", {
            detail: {
              displayName: nextDisplayName,
            },
          }),
        );
      }
      setSettingsMessage({
        type: "success",
        text: nextPassword ? "Password updated successfully." : "Account details updated.",
      });
    });
  }

  function handleAvatarSelection(event: React.ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0] ?? null;

    if (!file) {
      if (avatarPreviewUrl) {
        URL.revokeObjectURL(avatarPreviewUrl);
      }
      setAvatarBlob(null);
      setAvatarPreviewUrl(null);
      setAvatarMessage(null);
      return;
    }

    startAvatarTransition(async () => {
      setAvatarMessage(null);

      if (file.size > AVATAR_MAX_UPLOAD_BYTES) {
        setAvatarMessage({
          type: "error",
          text: "Avatar files must be 5MB or smaller before processing.",
        });
        event.target.value = "";
        return;
      }

      if (!isSupportedAvatarType(file.type)) {
        setAvatarMessage({
          type: "error",
          text: "Only JPG, PNG, and WebP avatar files are supported.",
        });
        event.target.value = "";
        return;
      }

      try {
        const processedBlob = await processAvatarFile(file);
        const nextPreviewUrl = URL.createObjectURL(processedBlob);

        if (avatarPreviewUrl) {
          URL.revokeObjectURL(avatarPreviewUrl);
        }

        setAvatarBlob(processedBlob);
        setAvatarPreviewUrl(nextPreviewUrl);
        setAvatarMessage({
          type: "success",
          text: "Avatar prepared. Save it below to upload the compressed WebP version.",
        });
      } catch (error) {
        setAvatarMessage({
          type: "error",
          text:
            error instanceof Error
              ? error.message
              : "Could not prepare that avatar image.",
        });
        event.target.value = "";
      }
    });
  }

  function handleAvatarUpload() {
    if (!user || !avatarBlob) {
      return;
    }

    startAvatarTransition(async () => {
      setAvatarMessage(null);

      try {
        const supabase = getSupabaseBrowserClient();
        const avatarPath = getAvatarPath(user.id);
        const avatarFile = new File([avatarBlob], "avatar.webp", {
          type: "image/webp",
        });
        const { error: uploadError } = await supabase.storage
          .from(AVATAR_BUCKET)
          .upload(avatarPath, avatarFile, {
            cacheControl: "3600",
            contentType: "image/webp",
            upsert: true,
          });

        if (uploadError) {
          setAvatarMessage({
            type: "error",
            text: uploadError.message,
          });
          return;
        }

        const { data } = supabase.storage.from(AVATAR_BUCKET).getPublicUrl(avatarPath);
        const nextAvatarUrl = `${data.publicUrl}?v=${Date.now()}`;
        const { error: profileError } = await supabase.rpc("update_own_profile_avatar", {
          p_avatar_url: nextAvatarUrl,
          p_avatar_path: avatarPath,
        });

        if (profileError) {
          setAvatarMessage({
            type: "error",
            text: profileError.message,
          });
          return;
        }

        setAvatarBlob(null);
        if (avatarPreviewUrl) {
          URL.revokeObjectURL(avatarPreviewUrl);
        }
        setAvatarPreviewUrl(null);
        window.dispatchEvent(
          new CustomEvent("profile-updated", {
            detail: {
              avatarUrl: nextAvatarUrl,
            },
          }),
        );
        setAvatarMessage({
          type: "success",
          text: "Profile picture uploaded successfully.",
        });
      } catch (error) {
        setAvatarMessage({
          type: "error",
          text:
            error instanceof Error
              ? error.message
              : "Could not upload your profile picture.",
        });
      }
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
              <div className="flex items-center gap-4 rounded-[22px] border border-fuchsia-500/15 bg-[linear-gradient(180deg,rgba(16,11,31,0.88),rgba(8,7,18,0.74))] p-4">
                <UserAvatar
                  imageUrl={avatarPreviewUrl ?? currentAvatarUrl}
                  name={currentDisplayName ?? user.email ?? "User"}
                  className="h-20 w-20"
                  textClassName="text-lg"
                />
                <div className="min-w-0">
                  <p className="text-sm uppercase tracking-[0.2em] text-zinc-500">
                    Profile Picture
                  </p>
                  {currentAvatarUrl || avatarPreviewUrl ? null : (
                    <p className="mt-2 text-sm leading-6 text-zinc-300">
                      No profile picture uploaded yet.
                    </p>
                  )}
                </div>
              </div>
              <div className="rounded-[22px] border border-fuchsia-500/15 bg-[linear-gradient(180deg,rgba(16,11,31,0.88),rgba(8,7,18,0.74))] p-4 text-sm leading-7 text-zinc-300">
                <p>Email: {user.email}</p>
                <p>Name: {currentDisplayName ?? "Not set"}</p>
                <p>Account type: {isAdmin ? "Host / Admin" : "User"}</p>
                <p>User ID: {user.id}</p>
              </div>
              <button
                type="button"
                onClick={handleSignOut}
                className="min-h-12 rounded-2xl border border-fuchsia-500/15 bg-[rgba(20,15,36,0.72)] px-5 py-3 text-sm font-bold uppercase tracking-[0.12em] text-white transition hover:bg-white/10"
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
                <div className="rounded-2xl border border-fuchsia-400/30 bg-fuchsia-500/10 px-4 py-3 text-sm leading-6 text-fuchsia-100">
                  Password recovery is active. Add a new password below to complete the reset.
                </div>
              ) : null}

              <label className="block">
                <span className="mb-2 block text-sm font-medium text-zinc-200">
                  Display name
                </span>
                <input
                  name="display_name"
                  defaultValue={currentDisplayName ?? ""}
                  className="min-h-12 w-full rounded-2xl border border-cyan-500/15 bg-[linear-gradient(180deg,rgba(18,12,35,0.92),rgba(8,8,20,0.76))] px-4 text-white outline-none transition focus:border-fuchsia-400/60 focus:shadow-[0_0_0_1px_rgba(255,45,166,0.24)]"
                />
              </label>

              <div className="rounded-[22px] border border-cyan-500/15 bg-[linear-gradient(180deg,rgba(11,11,27,0.92),rgba(7,9,20,0.82))] p-4">
                <p className="text-sm font-medium text-zinc-200">Profile picture</p>
                <div className="mt-4 flex flex-col gap-4 sm:flex-row sm:items-center">
                  <UserAvatar
                    imageUrl={avatarPreviewUrl ?? currentAvatarUrl}
                    name={currentDisplayName ?? user.email ?? "User"}
                    className="h-16 w-16"
                    textClassName="text-sm"
                  />
                  <div className="min-w-0 flex-1">
                    <input
                      type="file"
                      accept="image/jpeg,image/png,image/webp"
                      onChange={handleAvatarSelection}
                      className="block w-full text-sm text-zinc-300 file:mr-4 file:rounded-2xl file:border-0 file:bg-[linear-gradient(90deg,var(--brand-start),var(--brand-mid),var(--brand-end))] file:px-4 file:py-2 file:font-semibold file:text-white hover:file:brightness-110"
                    />
                    <p className="mt-2 text-sm leading-6 text-zinc-400">
                      JPG, PNG, or WebP. Max 5MB before processing.
                    </p>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={handleAvatarUpload}
                  disabled={isAvatarPending || !avatarBlob}
                  className="mt-4 min-h-12 rounded-2xl border border-fuchsia-500/15 bg-[rgba(20,15,36,0.72)] px-5 py-3 text-sm font-bold uppercase tracking-[0.12em] text-white transition hover:bg-white/10 disabled:cursor-not-allowed disabled:opacity-60"
                >
                  {isAvatarPending ? "Uploading..." : "Save Profile Picture"}
                </button>
              </div>

              <label className="block">
                <span className="mb-2 block text-sm font-medium text-zinc-200">
                  New password
                </span>
                <input
                  name="new_password"
                  type="password"
                  className="min-h-12 w-full rounded-2xl border border-cyan-500/15 bg-[linear-gradient(180deg,rgba(18,12,35,0.92),rgba(8,8,20,0.76))] px-4 text-white outline-none transition focus:border-fuchsia-400/60 focus:shadow-[0_0_0_1px_rgba(255,45,166,0.24)]"
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

              {avatarMessage ? (
                <div
                  className={`rounded-2xl border px-4 py-3 text-sm leading-6 ${
                    avatarMessage.type === "success"
                      ? "border-emerald-400/30 bg-emerald-400/10 text-emerald-100"
                      : "border-rose-400/30 bg-rose-400/10 text-rose-100"
                  }`}
                >
                  {avatarMessage.text}
                </div>
              ) : null}

              <button
                type="submit"
                disabled={isSettingsPending}
                className="min-h-12 rounded-2xl bg-[linear-gradient(90deg,var(--brand-start),var(--brand-mid),var(--brand-end))] px-5 py-3 text-sm font-bold uppercase tracking-[0.12em] text-white transition hover:brightness-110 disabled:cursor-not-allowed disabled:opacity-70"
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
                  className="min-h-12 w-full rounded-2xl border border-cyan-500/15 bg-[linear-gradient(180deg,rgba(18,12,35,0.92),rgba(8,8,20,0.76))] px-4 text-white outline-none transition focus:border-rose-400/60"
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

      <div className="max-w-3xl">
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
                  ? "bg-[linear-gradient(90deg,var(--brand-start),var(--brand-mid),var(--brand-end))] text-white"
                  : "border border-fuchsia-500/15 bg-[rgba(20,15,36,0.72)] text-white"
              }`}
            >
              Sign In
            </button>
            <button
              type="button"
              onClick={() => setMode("sign-up")}
              className={`rounded-2xl px-4 py-2 text-sm font-semibold transition ${
                mode === "sign-up"
                  ? "bg-[linear-gradient(90deg,var(--brand-start),var(--brand-mid),var(--brand-end))] text-white"
                  : "border border-fuchsia-500/15 bg-[rgba(20,15,36,0.72)] text-white"
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
                  className="min-h-12 w-full rounded-2xl border border-cyan-500/15 bg-[linear-gradient(180deg,rgba(18,12,35,0.92),rgba(8,8,20,0.76))] px-4 text-white outline-none transition focus:border-fuchsia-400/60 focus:shadow-[0_0_0_1px_rgba(255,45,166,0.24)]"
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
                className="min-h-12 w-full rounded-2xl border border-cyan-500/15 bg-[linear-gradient(180deg,rgba(18,12,35,0.92),rgba(8,8,20,0.76))] px-4 text-white outline-none transition focus:border-fuchsia-400/60 focus:shadow-[0_0_0_1px_rgba(255,45,166,0.24)]"
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
                className="min-h-12 w-full rounded-2xl border border-cyan-500/15 bg-[linear-gradient(180deg,rgba(18,12,35,0.92),rgba(8,8,20,0.76))] px-4 text-white outline-none transition focus:border-fuchsia-400/60 focus:shadow-[0_0_0_1px_rgba(255,45,166,0.24)]"
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
              className="min-h-12 rounded-2xl bg-[linear-gradient(90deg,var(--brand-start),var(--brand-mid),var(--brand-end))] px-5 py-3 text-sm font-bold uppercase tracking-[0.12em] text-white transition hover:brightness-110 disabled:cursor-not-allowed disabled:opacity-70"
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
                className="min-h-12 w-full rounded-2xl border border-fuchsia-500/15 bg-[rgba(20,15,36,0.72)] px-5 py-3 text-sm font-bold uppercase tracking-[0.12em] text-white transition hover:bg-white/10 disabled:cursor-not-allowed disabled:opacity-70"
              >
                Forgot Password
              </button>
            ) : null}
          </form>
        </SectionCard>
      </div>

      <LegalLinks />
    </div>
  );
}
