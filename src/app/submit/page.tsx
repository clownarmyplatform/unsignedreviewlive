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
            description="A straightforward form artists can use without hunting through comment sections. This is now the first real Supabase-backed flow in the app."
          />

          <SubmissionWindowBanner />

          <SectionCard
            title="Submission Form"
            description="Submitting here writes a real submitted track entry to the nearest upcoming show in Supabase."
          >
            <SubmitTrackForm />
          </SectionCard>
        </div>
      </SubmissionRulesGate>
    </AuthGate>
  );
}
