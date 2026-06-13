"use client";

import { useAuth } from "@/components/providers/auth-provider";
import { ActionLink } from "@/components/ui/action-link";

export function PublicHomeActions() {
  const { user } = useAuth();

  return (
    <>
      <ActionLink href="/account">Sign In</ActionLink>
      {user ? (
        <ActionLink href="/dashboard" variant="secondary">
          User Dashboard
        </ActionLink>
      ) : (
        <ActionLink href="/account" variant="secondary">
          Create An Account
        </ActionLink>
      )}
    </>
  );
}
