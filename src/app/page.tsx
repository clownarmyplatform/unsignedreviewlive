import { HomeNoticeboardPreview } from "@/components/home-noticeboard-preview";
import { HomeShowFlowPanel } from "@/components/home-show-flow-panel";
import { LatestTotnWinnerPanel } from "@/components/latest-totn-winner-panel";
import { PageIntro } from "@/components/ui/page-intro";
import { PublicHomeActions } from "@/components/public-home-actions";
import { PublicHomeShowPanel } from "@/components/public-home-show-panel";
import { SectionCard } from "@/components/ui/section-card";

export default function HomePage() {
  return (
    <div className="space-y-6">
      <PageIntro
        eyebrow="Unsigned Review Live"
        title="Home of the Clown Army"
        description="Sign in or create an account to submit your track for review on our weekly show!"
        actions={<PublicHomeActions />}
      />

      <div className="grid gap-6">
        <SectionCard title="Upcoming Show">
          <PublicHomeShowPanel />
        </SectionCard>

        <SectionCard title="Previous TOTN Winners">
          <LatestTotnWinnerPanel />
        </SectionCard>
      </div>

      <div className="grid gap-6 xl:grid-cols-2">
        <SectionCard title="Noticeboard">
          <HomeNoticeboardPreview />
        </SectionCard>

        <SectionCard title="Show Flow">
          <HomeShowFlowPanel />
        </SectionCard>
      </div>
    </div>
  );
}
