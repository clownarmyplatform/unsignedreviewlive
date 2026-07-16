import { NOTICEBOARD_IMAGE_ACCEPTED_TYPES, NOTICEBOARD_IMAGE_MAX_BYTES } from "@/lib/noticeboard";
import {
  createImageModerationMetadata,
  type ImageModerationDecision,
} from "@/lib/media/image-moderation";
import { TrackSubmissionError } from "@/lib/submissions/track-submission";

export type AdminNoticeboardUser = {
  email: string | null;
  id: string;
  role: "user" | "admin";
};

type SaveNoticeboardPostResult = {
  created: boolean;
  post: unknown;
};

type SaveNoticeboardPostInput = {
  body: string;
  imageBuffer: Buffer | null;
  imageContentType: string | null;
  imageFileName: string | null;
  postId: string | null;
  removeExistingImage: boolean;
  tag: string | null;
  title: string;
};

type SaveNoticeboardPostDeps = {
  getUserFromAccessToken: (accessToken: string) => Promise<AdminNoticeboardUser | null>;
  logImageModeration: (input: {
    actorEmail: string | null;
    actorRole: "admin";
    actorUserId: string;
    metadata: ReturnType<typeof createImageModerationMetadata>;
    moderation: ImageModerationDecision;
    relatedNoticeboardPostId: string | null;
    targetType: "noticeboard_image";
  }) => Promise<void>;
  moderateImage: (input: {
    buffer: Buffer;
    contentType: string;
  }) => Promise<ImageModerationDecision>;
  saveNoticeboardPost: (input: SaveNoticeboardPostInput) => Promise<SaveNoticeboardPostResult>;
};

type DeleteNoticeboardPostDeps = {
  deleteNoticeboardPost: (postId: string) => Promise<void>;
  getUserFromAccessToken: (accessToken: string) => Promise<AdminNoticeboardUser | null>;
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
      "You must be signed in to manage noticeboard posts.",
      401,
    );
  }

  const accessToken = authorization.slice("bearer ".length).trim();

  if (!accessToken) {
    throw new TrackSubmissionError(
      "UNAUTHENTICATED",
      "You must be signed in to manage noticeboard posts.",
      401,
    );
  }

  return accessToken;
}

async function requireAdminUser(
  request: Request,
  getUserFromAccessToken:
    | SaveNoticeboardPostDeps["getUserFromAccessToken"]
    | DeleteNoticeboardPostDeps["getUserFromAccessToken"],
) {
  const accessToken = getAccessToken(request);
  const user = await getUserFromAccessToken(accessToken);

  if (!user) {
    throw new TrackSubmissionError(
      "UNAUTHENTICATED",
      "You must be signed in to manage noticeboard posts.",
      401,
    );
  }

  if (user.role !== "admin") {
    throw new TrackSubmissionError(
      "UNAUTHENTICATED",
      "You do not have permission to manage noticeboard posts.",
      403,
    );
  }

  return user;
}

export async function handleAdminNoticeboardSaveRequest(
  request: Request,
  deps: SaveNoticeboardPostDeps,
) {
  try {
    const user = await requireAdminUser(request, deps.getUserFromAccessToken);
    const formData = await request.formData();
    const title = String(formData.get("title") ?? "").trim();
    const body = String(formData.get("body") ?? "").trim();
    const tagValue = String(formData.get("tag") ?? "").trim();
    const postIdValue = String(formData.get("post_id") ?? "").trim();
    const removeExistingImage = String(formData.get("remove_existing_image") ?? "") === "true";
    const image = formData.get("image");

    if (!title || !body) {
      return errorResponse(400, "Title and notice text are required.");
    }

    let imageBuffer: Buffer | null = null;
    let imageContentType: string | null = null;
    let imageFileName: string | null = null;

    if (image instanceof File && image.size > 0) {
      if (image.size > NOTICEBOARD_IMAGE_MAX_BYTES) {
        return errorResponse(400, "Image files must be 2MB or smaller.");
      }

      if (
        !NOTICEBOARD_IMAGE_ACCEPTED_TYPES.includes(
          image.type as (typeof NOTICEBOARD_IMAGE_ACCEPTED_TYPES)[number],
        )
      ) {
        return errorResponse(
          400,
          "Only PNG, JPG, WebP, and non-animated GIF images are supported.",
        );
      }

      imageBuffer = Buffer.from(await image.arrayBuffer());
      imageContentType = image.type;
      imageFileName = image.name || null;

      const moderation = await deps.moderateImage({
        buffer: imageBuffer,
        contentType: image.type,
      });
      const metadata = createImageModerationMetadata(image, imageBuffer);

      await deps.logImageModeration({
        actorEmail: user.email,
        actorRole: "admin",
        actorUserId: user.id,
        metadata,
        moderation,
        relatedNoticeboardPostId: postIdValue || null,
        targetType: "noticeboard_image",
      });

      if (moderation.status === "flagged") {
        return errorResponse(
          422,
          "That image could not be added to the noticeboard post. Please choose a different image.",
        );
      }

      if (moderation.status === "error") {
        return errorResponse(
          503,
          "Image moderation is temporarily unavailable. The post has not been published.",
        );
      }
    }

    const result = await deps.saveNoticeboardPost({
      body,
      imageBuffer,
      imageContentType,
      imageFileName,
      postId: postIdValue || null,
      removeExistingImage,
      tag: tagValue || null,
      title,
    });

    return Response.json({
      message: result.created ? "Noticeboard post created." : "Noticeboard post updated.",
      post: result.post,
    });
  } catch (error) {
    if (error instanceof TrackSubmissionError) {
      return errorResponse(error.status, error.message);
    }

    return errorResponse(
      500,
      error instanceof Error ? error.message : "Could not save the noticeboard post.",
    );
  }
}

export async function handleAdminNoticeboardDeleteRequest(
  request: Request,
  deps: DeleteNoticeboardPostDeps,
) {
  try {
    await requireAdminUser(request, deps.getUserFromAccessToken);
    const payload = (await request.json()) as Record<string, unknown>;
    const postId = typeof payload.post_id === "string" ? payload.post_id.trim() : "";

    if (!postId) {
      return errorResponse(400, "Post ID is required.");
    }

    await deps.deleteNoticeboardPost(postId);

    return Response.json({
      message: "Noticeboard post deleted.",
    });
  } catch (error) {
    if (error instanceof TrackSubmissionError) {
      return errorResponse(error.status, error.message);
    }

    return errorResponse(
      500,
      error instanceof Error ? error.message : "Could not delete the noticeboard post.",
    );
  }
}
