import { LatestTotnWinnerPanel } from "@/components/latest-totn-winner-panel";
import { PageIntro } from "@/components/ui/page-intro";
import { SectionCard } from "@/components/ui/section-card";
import { TotnLiveBoard } from "@/components/totn-live-board";

export default function TotnPage() {
  return (
    <div className="space-y-6">
      <PageIntro
        eyebrow="Track of the night"
        title="TOTN Nominations"
        description="Track of the Night nominations and voting."
      />

      <SectionCard
        title="Previous TOTN Winners"
        description="The latest closed Track of the Night result."
      >
        <LatestTotnWinnerPanel />
      </SectionCard>

      <SectionCard
        title="Current Nominations"
        description="This week's nominated tracks."
      >
        <TotnLiveBoard />
      </SectionCard>
    </div>
  );
}
