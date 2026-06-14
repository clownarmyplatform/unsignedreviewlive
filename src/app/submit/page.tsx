import { AuthGate } from "@/components/auth/auth-gate";
import { SubmissionRulesGate } from "@/components/submission-rules-gate";
import { SubmitTrackForm } from "@/components/submit-track-form";
import { SubmissionWindowBanner } from "@/components/submission-window-banner";
import { PageIntro } from "@/components/ui/page-intro";
import { SectionCard } from "@/components/ui/section-card";

export default function SubmitPage() {
  return (
    <AuthGate>
      <SubmissionRulesGate>
        <div className="space-y-6">
          <PageIntro
            eyebrow="Track submissions"
            title="Submit A Track"
          />

          <SubmissionWindowBanner />

          <SectionCard
            title="Submission Form"
          >
            <SubmitTrackForm />
          </SectionCard>
        </div>
      </SubmissionRulesGate>
    </AuthGate>
  );
}
