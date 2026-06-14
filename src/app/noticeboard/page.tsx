import { LiveNoticeboardBoard } from "@/components/live-noticeboard-board";
import { PageIntro } from "@/components/ui/page-intro";
import { SectionCard } from "@/components/ui/section-card";

export default function NoticeboardPage() {
  return (
    <div className="space-y-6">
      <PageIntro
        eyebrow="Community updates"
        title="Noticeboard"
      />

      <SectionCard title="Latest Posts">
        <LiveNoticeboardBoard />
      </SectionCard>
    </div>
  );
}
