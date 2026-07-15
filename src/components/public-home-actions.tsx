"use client";

import { useAuth } from "@/components/providers/auth-provider";
import { ActionLink } from "@/components/ui/action-link";

export function PublicHomeActions() {
  const { user } = useAuth();

  if (user) {
    return (
      <>
        <ActionLink href="/dashboard">Dashboard</ActionLink>
        <ActionLink href="/account" variant="secondary">
          Account
        </ActionLink>
      </>
    );
  }

  return (
    <>
      <ActionLink href="/account">Sign In</ActionLink>
      <ActionLink href="/account" variant="secondary">
        Create An Account
      </ActionLink>
    </>
  );
}
