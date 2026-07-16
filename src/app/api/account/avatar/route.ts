import { handleAvatarUploadRequest } from "@/lib/account/handle-avatar-upload-request";
import { saveAvatar } from "@/lib/account/save-avatar";
import { persistImageModerationLog } from "@/lib/media/image-moderation-log";
import { moderateImageBuffer } from "@/lib/media/image-moderation";
import { getRequestUserFromAccessToken } from "@/lib/server/request-auth";
import { createSupabaseServiceRoleClient } from "@/lib/supabase/server";

export async function POST(request: Request) {
  return handleAvatarUploadRequest(request, {
    getUserFromAccessToken: getRequestUserFromAccessToken,
    async logImageModeration(input) {
      const adminClient = createSupabaseServiceRoleClient();
      await persistImageModerationLog(adminClient, input);
    },
    moderateImage: moderateImageBuffer,
    async saveAvatar(input) {
      const adminClient = createSupabaseServiceRoleClient();
      return saveAvatar(adminClient, input);
    },
  });
}
