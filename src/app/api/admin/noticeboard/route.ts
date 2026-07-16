import {
  handleAdminNoticeboardDeleteRequest,
  handleAdminNoticeboardSaveRequest,
} from "@/lib/noticeboard/handle-admin-noticeboard-request";
import {
  deleteAdminNoticeboardPost,
  saveAdminNoticeboardPost,
} from "@/lib/noticeboard/save-admin-noticeboard-post";
import { persistImageModerationLog } from "@/lib/media/image-moderation-log";
import { moderateImageBuffer } from "@/lib/media/image-moderation";
import { getRequestUserFromAccessToken } from "@/lib/server/request-auth";
import { createSupabaseServiceRoleClient } from "@/lib/supabase/server";

export async function POST(request: Request) {
  return handleAdminNoticeboardSaveRequest(request, {
    getUserFromAccessToken: getRequestUserFromAccessToken,
    async logImageModeration(input) {
      const adminClient = createSupabaseServiceRoleClient();
      await persistImageModerationLog(adminClient, input);
    },
    moderateImage: moderateImageBuffer,
    async saveNoticeboardPost(input) {
      const adminClient = createSupabaseServiceRoleClient();
      return saveAdminNoticeboardPost(adminClient, input);
    },
  });
}

export async function DELETE(request: Request) {
  return handleAdminNoticeboardDeleteRequest(request, {
    async deleteNoticeboardPost(postId) {
      const adminClient = createSupabaseServiceRoleClient();
      await deleteAdminNoticeboardPost(adminClient, postId);
    },
    getUserFromAccessToken: getRequestUserFromAccessToken,
  });
}
