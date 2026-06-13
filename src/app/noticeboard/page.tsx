import { LiveNoticeboardBoard } from "@/components/live-noticeboard-board";
import { PageIntro } from "@/components/ui/page-intro";
import { SectionCard } from "@/components/ui/section-card";

export default function NoticeboardPage() {
  return (
    <div className="space-y-6">
      <PageIntro
        eyebrow="Community updates"
        title="Noticeboard"
        description="A central place for show notices, reminders, and community posts that should not get buried in chat."
      />

      <SectionCard
        title="Latest Posts"
        description="Live noticeboard posts from the host/admin side of the app."
      >
        <LiveNoticeboardBoard />
      </SectionCard>
    </div>
  );
}
