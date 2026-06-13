import { AuthGate } from "@/components/auth/auth-gate";
import { AdminCreateShowPanel } from "@/components/admin-create-show-panel";
import { AdminDashboardOverview } from "@/components/admin-dashboard-overview";
import { AdminModerationPanel } from "@/components/admin-moderation-panel";
import { AdminNoticeboardManager } from "@/components/admin-noticeboard-manager";
import { PageIntro } from "@/components/ui/page-intro";
import { SectionCard } from "@/components/ui/section-card";

export default function AdminPage() {
  return (
    <AuthGate allowAdminOnly>
      <div className="space-y-6">
        <PageIntro
          eyebrow="Host control"
          title="Admin Dashboard"
          description="Host controls for shows, queue activity, TOTN, and the noticeboard."
        />

        <AdminDashboardOverview mode="stats" />

        <SectionCard
          title="Create Show"
          description="Create the next show and open it for submissions."
          collapsible
          defaultOpen={false}
        >
          <AdminCreateShowPanel />
        </SectionCard>

        <SectionCard
          title="Upcoming Show"
          description="Current show details and settings."
          collapsible
          defaultOpen={false}
        >
          <AdminDashboardOverview mode="upcoming" />
        </SectionCard>

        <SectionCard
          title="Noticeboard Manager"
          description="Create, edit, and delete noticeboard posts here, with optional small image uploads and markdown formatting."
          collapsible
          defaultOpen={false}
        >
          <AdminNoticeboardManager />
        </SectionCard>

        <SectionCard
          title="Moderation"
          description="User management, submission moderation, and a live audit trail."
          collapsible
          defaultOpen={false}
        >
          <AdminModerationPanel />
        </SectionCard>
      </div>
    </AuthGate>
  );
}
