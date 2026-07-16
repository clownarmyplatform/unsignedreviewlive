import { createSupabaseAuthClient, createSupabaseServiceRoleClient } from "@/lib/supabase/server";
import { handleTrackSubmissionRequest } from "@/lib/submissions/handle-track-submission-request";
import { moderateTrackSubmission } from "@/lib/submissions/openai-moderation";
import { persistTrackSubmission } from "@/lib/submissions/persist-track-submission";

export async function POST(request: Request) {
  return handleTrackSubmissionRequest(request, {
    async getUserFromAccessToken(accessToken) {
      const authClient = createSupabaseAuthClient(accessToken);
      const {
        data: { user },
        error,
      } = await authClient.auth.getUser();

      if (error || !user) {
        return null;
      }

      return {
        email: user.email ?? null,
        id: user.id,
      };
    },
    moderateSubmission: moderateTrackSubmission,
    async persistSubmission(input) {
      const adminClient = createSupabaseServiceRoleClient();
      return persistTrackSubmission(adminClient, input);
    },
  });
}
