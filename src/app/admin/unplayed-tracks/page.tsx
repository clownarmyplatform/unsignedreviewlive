import { AuthGate } from "@/components/auth/auth-gate";
import { AdminUnplayedTracksBoard } from "@/components/admin-unplayed-tracks-board";
import { PageIntro } from "@/components/ui/page-intro";

export default function AdminUnplayedTracksPage() {
  return (
    <AuthGate allowAdminOnly>
      <div className="space-y-6">
        <PageIntro
          eyebrow="Host control"
          title="The Streaming Room"
          description="Live studio view for the current show queue, with play, revisit, and review control."
        />
        <AdminUnplayedTracksBoard />
      </div>
    </AuthGate>
  );
}
