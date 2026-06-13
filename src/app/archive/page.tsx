import { UrlArchiveBoard } from "@/components/url-archive-board";
import { PageIntro } from "@/components/ui/page-intro";
import { SectionCard } from "@/components/ui/section-card";

export default function ArchivePage() {
  return (
    <div className="space-y-6">
      <PageIntro
        eyebrow="Past shows"
        title="URL Archive"
        description="Browse completed shows, revisit old live links, review track lists, and see the recorded TOTN winners."
      />

      <SectionCard
        title="Archived Shows"
        description="Shows appear here automatically once their scheduled end time has passed."
      >
        <UrlArchiveBoard />
      </SectionCard>
    </div>
  );
}
