"use client";

import { useAuth } from "@/components/providers/auth-provider";
import { PublicHomeActions } from "@/components/public-home-actions";
import { PageIntro } from "@/components/ui/page-intro";

export function HomePageIntro() {
  const { user } = useAuth();

  return (
    <PageIntro
      title="Welcome to uniqueKontent"
      description={
        user
          ? undefined
          : "Sign in or create an account to submit your track for review on our weekly show!"
      }
      actions={<PublicHomeActions />}
    />
  );
}
