import { HomePageIntro } from "@/components/home-page-intro";
import { HomeNoticeboardPreview } from "@/components/home-noticeboard-preview";
import { HomeShowFlowPanel } from "@/components/home-show-flow-panel";
import { LatestTotnWinnerPanel } from "@/components/latest-totn-winner-panel";
import { PublicHomeShowPanel } from "@/components/public-home-show-panel";
import { SectionCard } from "@/components/ui/section-card";

export default function HomePage() {
  return (
    <div className="space-y-6">
      <HomePageIntro />

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
