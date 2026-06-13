import { AuthGate } from "@/components/auth/auth-gate";
import { DashboardActions } from "@/components/dashboard-actions";
import { DashboardStatusPanel } from "@/components/dashboard-status-panel";
import { SubmissionWindowBanner } from "@/components/submission-window-banner";
import { UserSubmissionsPanel } from "@/components/user-submissions-panel";
import { PageIntro } from "@/components/ui/page-intro";
import { SectionCard } from "@/components/ui/section-card";

export default function DashboardPage() {
  return (
    <AuthGate>
      <div className="space-y-6">
        <PageIntro
          eyebrow="Artist view"
          title="User Dashboard"
          description="Your space for show updates, submission status, and weekly voting."
          actions={<DashboardActions />}
        />

        <div className="grid gap-6 lg:grid-cols-[1.2fr_0.8fr]">
          <SectionCard
            title="Weekly Show Hub"
            description="Show timing, queue space, and current weekly details."
          >
            <div className="space-y-4">
              <SubmissionWindowBanner />
              <div className="rounded-[22px] border border-dashed border-white/10 bg-white/[0.03] p-4 text-sm leading-6 text-zinc-300">
                Stay on top of the current show and your place in it.
              </div>
            </div>
          </SectionCard>

          <DashboardStatusPanel />
        </div>

        <UserSubmissionsPanel />
      </div>
    </AuthGate>
  );
}
