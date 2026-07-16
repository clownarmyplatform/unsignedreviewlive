import { AVATAR_MAX_UPLOAD_BYTES } from "@/lib/avatar";
import {
  createImageModerationMetadata,
  type ImageModerationDecision,
} from "@/lib/media/image-moderation";
import { TrackSubmissionError } from "@/lib/submissions/track-submission";

type AvatarUploadUser = {
  email: string | null;
  id: string;
  role: "user" | "admin";
};

type AvatarUploadDeps = {
  getUserFromAccessToken: (accessToken: string) => Promise<AvatarUploadUser | null>;
  logImageModeration: (input: {
    actorEmail: string | null;
    actorRole: "user" | "admin";
    actorUserId: string;
    metadata: ReturnType<typeof createImageModerationMetadata>;
    moderation: ImageModerationDecision;
    targetType: "avatar";
  }) => Promise<void>;
  moderateImage: (input: {
    buffer: Buffer;
    contentType: string;
  }) => Promise<ImageModerationDecision>;
  saveAvatar: (input: {
    contentType: string;
    fileBuffer: Buffer;
    userId: string;
  }) => Promise<{
    avatarUrl: string;
  }>;
};

function errorResponse(status: number, message: string) {
  return Response.json(
    {
      error: message,
    },
    {
      status,
    },
  );
}

function getAccessToken(request: Request) {
  const authorization = request.headers.get("authorization")?.trim() ?? "";

  if (!authorization.toLowerCase().startsWith("bearer ")) {
    throw new TrackSubmissionError(
      "UNAUTHENTICATED",
      "You must be signed in to update your profile picture.",
      401,
    );
  }

  const accessToken = authorization.slice("bearer ".length).trim();

  if (!accessToken) {
    throw new TrackSubmissionError(
      "UNAUTHENTICATED",
      "You must be signed in to update your profile picture.",
      401,
    );
  }

  return accessToken;
}

export async function handleAvatarUploadRequest(
  request: Request,
  deps: AvatarUploadDeps,
) {
  try {
    const accessToken = getAccessToken(request);
    const user = await deps.getUserFromAccessToken(accessToken);

    if (!user) {
      return errorResponse(401, "You must be signed in to update your profile picture.");
    }

    const formData = await request.formData();
    const avatar = formData.get("avatar");

    if (!(avatar instanceof File)) {
      return errorResponse(400, "Choose an avatar image before saving.");
    }

    if (avatar.size <= 0) {
      return errorResponse(400, "Choose an avatar image before saving.");
    }

    if (avatar.size > AVATAR_MAX_UPLOAD_BYTES) {
      return errorResponse(400, "Avatar files must be 5MB or smaller.");
    }

    if (avatar.type !== "image/webp") {
      return errorResponse(
        400,
        "Avatar upload must use the prepared WebP image.",
      );
    }

    const fileBuffer = Buffer.from(await avatar.arrayBuffer());
    const moderation = await deps.moderateImage({
      buffer: fileBuffer,
      contentType: avatar.type,
    });
    const metadata = createImageModerationMetadata(avatar, fileBuffer);

    await deps.logImageModeration({
      actorEmail: user.email,
      actorRole: user.role,
      actorUserId: user.id,
      metadata,
      moderation,
      targetType: "avatar",
    });

    if (moderation.status === "flagged") {
      return errorResponse(
        422,
        "That profile picture could not be uploaded. Please choose a different image.",
      );
    }

    if (moderation.status === "error") {
      return errorResponse(
        503,
        "Profile picture moderation is temporarily unavailable. Please try again shortly.",
      );
    }

    const savedAvatar = await deps.saveAvatar({
      contentType: avatar.type,
      fileBuffer,
      userId: user.id,
    });

    return Response.json({
      avatarUrl: savedAvatar.avatarUrl,
      message: "Profile picture uploaded successfully.",
    });
  } catch (error) {
    if (error instanceof TrackSubmissionError) {
      return errorResponse(error.status, error.message);
    }

    return errorResponse(
      500,
      error instanceof Error
        ? error.message
        : "Could not upload your profile picture.",
    );
  }
}
