"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect } from "react";
import { useAuth } from "@/components/providers/auth-provider";

export function AuthGate({
  children,
  allowAdminOnly = false,
}: {
  children: React.ReactNode;
  allowAdminOnly?: boolean;
}) {
  const { isAdmin, isLoading, user } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (isLoading) {
      return;
    }

    if (!user) {
      router.replace("/account");
      return;
    }

    if (allowAdminOnly && !isAdmin) {
      router.replace("/dashboard");
    }
  }, [allowAdminOnly, isAdmin, isLoading, router, user]);

  if (isLoading) {
    return (
      <div className="rounded-[24px] border border-fuchsia-500/15 bg-[linear-gradient(180deg,rgba(16,11,31,0.88),rgba(8,7,18,0.74))] p-5 text-sm leading-7 text-zinc-300">
        Checking account access...
      </div>
    );
  }

  if (!user) {
    return (
      <div className="rounded-[24px] border border-fuchsia-500/15 bg-[linear-gradient(180deg,rgba(16,11,31,0.88),rgba(8,7,18,0.74))] p-5 text-sm leading-7 text-zinc-300">
        Account access is required here. Head to{" "}
        <Link href="/account" className="text-fuchsia-500 underline underline-offset-4">
          Account
        </Link>{" "}
        to sign in or create a user.
      </div>
    );
  }

  if (allowAdminOnly && !isAdmin) {
    return (
      <div className="rounded-[24px] border border-fuchsia-500/15 bg-[linear-gradient(180deg,rgba(16,11,31,0.88),rgba(8,7,18,0.74))] p-5 text-sm leading-7 text-zinc-300">
        This area is reserved for the host/admin account.
      </div>
    );
  }

  return <>{children}</>;
}
