import Link from "next/link";
import { ShowQueueBoard } from "@/components/show-queue-board";
import { PageIntro } from "@/components/ui/page-intro";
import { SectionCard } from "@/components/ui/section-card";

export default function QueuePage() {
  return (
    <div className="space-y-6">
      <PageIntro
        eyebrow="Show order"
        title="Track Queue"
        description="The current running order and live track list for the active show."
        actions={
          <Link
            href="/submit"
            className="inline-flex min-h-12 items-center justify-center rounded-2xl bg-[linear-gradient(90deg,var(--brand-start),var(--brand-mid),var(--brand-end))] px-5 py-3 text-sm font-bold uppercase tracking-[0.12em] text-white transition hover:brightness-110"
          >
            Submit Track
          </Link>
        }
      />

      <SectionCard
        title="Queue / Show List"
        description="Current entries for this week's show."
      >
        <ShowQueueBoard />
      </SectionCard>
    </div>
  );
}
