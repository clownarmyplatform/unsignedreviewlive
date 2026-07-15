"use client";

import { useEffect, useState } from "react";
import { useAuth } from "@/components/providers/auth-provider";
import { ActionLink } from "@/components/ui/action-link";
import { getSupabaseBrowserClient } from "@/lib/supabase/client";
import type { Database } from "@/lib/supabase/types";

type AdminSnapshot =
  Database["public"]["Functions"]["get_admin_dashboard_snapshot"]["Returns"][number];

export function DashboardActions() {
  const { user } = useAuth();
  const [hasSubmission, setHasSubmission] = useState(false);

  useEffect(() => {
    let isMounted = true;

    async function loadSubmissionState() {
      if (!user) {
        if (isMounted) {
          setHasSubmission(false);
        }
        return;
      }

      try {
        const supabase = getSupabaseBrowserClient();
        const { data: snapshotData } = await supabase.rpc("get_admin_dashboard_snapshot");
        const snapshot = snapshotData?.[0] as AdminSnapshot | undefined;

        if (!isMounted || !snapshot?.show_id) {
          if (isMounted) {
            setHasSubmission(false);
          }
          return;
        }

        const { data } = await supabase
          .from("submissions")
          .select("id")
          .eq("auth_user_id", user.id)
          .eq("show_id", snapshot.show_id)
          .limit(1);

        if (isMounted) {
          setHasSubmission((data?.length ?? 0) > 0);
        }
      } catch {
        if (isMounted) {
          setHasSubmission(false);
        }
      }
    }

    loadSubmissionState();

    return () => {
      isMounted = false;
    };
  }, [user]);

  return (
    <>
      {hasSubmission ? (
        <span className="inline-flex min-h-12 items-center justify-center rounded-2xl border border-fuchsia-400/30 bg-fuchsia-500/10 px-5 py-3 text-sm font-bold uppercase tracking-[0.12em] text-fuchsia-100">
          Track Submitted
        </span>
      ) : (
        <ActionLink href="/submit">Submit Track</ActionLink>
      )}
      <ActionLink href="/queue" variant="secondary">
        View Queue
      </ActionLink>
    </>
  );
}
