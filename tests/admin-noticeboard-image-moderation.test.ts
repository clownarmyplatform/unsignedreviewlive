import assert from "node:assert/strict";
import test from "node:test";
import {
  handleAdminNoticeboardDeleteRequest,
  handleAdminNoticeboardSaveRequest,
} from "../src/lib/noticeboard/handle-admin-noticeboard-request";
import type { ImageModerationDecision } from "../src/lib/media/image-moderation";

function createSaveRequest(options?: {
  body?: string;
  image?: File | null;
  includeAuth?: boolean;
  postId?: string | null;
  removeExistingImage?: boolean;
  tag?: string;
  title?: string;
}) {
  const formData = new FormData();
  formData.append("title", options?.title ?? "Platform update");
  formData.append("body", options?.body ?? "Fresh noticeboard copy.");
  formData.append("tag", options?.tag ?? "News");
  formData.append("post_id", options?.postId ?? "");
  formData.append(
    "remove_existing_image",
    options?.removeExistingImage ? "true" : "false",
  );

  if (options?.image) {
    formData.append("image", options.image);
  }

  return new Request("http://localhost/api/admin/noticeboard", {
    body: formData,
    headers: options?.includeAuth === false
      ? undefined
      : {
          Authorization: "Bearer admin-token",
        },
    method: "POST",
  });
}

function createDeleteRequest(postId: string, includeAuth = true) {
  return new Request("http://localhost/api/admin/noticeboard", {
    body: JSON.stringify({
      post_id: postId,
    }),
    headers: includeAuth
      ? {
          Authorization: "Bearer admin-token",
          "Content-Type": "application/json",
        }
      : {
          "Content-Type": "application/json",
        },
    method: "DELETE",
  });
}

function createDeps(overrides?: {
  moderation?: ImageModerationDecision;
  role?: "user" | "admin";
  saveNoticeboardPost?: () => Promise<{ created: boolean; post: { id: string; title: string } }>;
}) {
  const moderation =
    overrides?.moderation ??
    ({
      categories: null,
      checkedAt: "2026-07-16T15:00:00.000Z",
      error: null,
      model: "omni-moderation-latest",
      scores: null,
      status: "clean",
    } satisfies ImageModerationDecision);

  let saveCalls = 0;
  let deleteCalls = 0;
  let logCalls = 0;

  return {
    deleteDeps: {
      async deleteNoticeboardPost(postId: string) {
        deleteCalls += 1;
        assert.equal(postId, "post-123");
      },
      async getUserFromAccessToken(accessToken: string) {
        assert.equal(accessToken, "admin-token");

        return {
          email: "admin@example.com",
          id: "admin-user",
          role: (overrides?.role ?? "admin") as "user" | "admin",
        };
      },
    },
    saveDeps: {
      async getUserFromAccessToken(accessToken: string) {
        assert.equal(accessToken, "admin-token");

        return {
          email: "admin@example.com",
          id: "admin-user",
          role: (overrides?.role ?? "admin") as "user" | "admin",
        };
      },
      async logImageModeration(input: {
        actorEmail: string | null;
        actorRole: "admin";
        actorUserId: string;
        metadata: {
          contentType: string;
          fileName: string | null;
          sha256: string;
          sizeBytes: number;
        };
        moderation: ImageModerationDecision;
        relatedNoticeboardPostId: string | null;
        targetType: "noticeboard_image";
      }) {
        logCalls += 1;
        assert.equal(input.actorRole, "admin");
        assert.equal(input.targetType, "noticeboard_image");
        assert.equal(input.moderation.status, moderation.status);
      },
      async moderateImage(input: { buffer: Buffer; contentType: string }) {
        assert.ok(input.buffer.byteLength > 0);
        assert.equal(input.contentType, "image/png");
        return moderation;
      },
      async saveNoticeboardPost() {
        saveCalls += 1;

        if (overrides?.saveNoticeboardPost) {
          return overrides.saveNoticeboardPost();
        }

        return {
          created: true,
          post: {
            id: "post-123",
            title: "Platform update",
          },
        };
      },
    },
    get deleteCalls() {
      return deleteCalls;
    },
    get logCalls() {
      return logCalls;
    },
    get saveCalls() {
      return saveCalls;
    },
  };
}

async function readJson(response: Response) {
  return (await response.json()) as Record<string, unknown>;
}

test("saves a clean admin noticeboard image", async () => {
  const harness = createDeps();
  const response = await handleAdminNoticeboardSaveRequest(
    createSaveRequest({
      image: new File(["image"], "notice.png", { type: "image/png" }),
    }),
    harness.saveDeps,
  );
  const payload = await readJson(response);

  assert.equal(response.status, 200);
  assert.equal(payload.message, "Noticeboard post created.");
  assert.equal((payload.post as { id: string }).id, "post-123");
  assert.equal(harness.logCalls, 1);
  assert.equal(harness.saveCalls, 1);
});

test("blocks flagged noticeboard images without saving the post", async () => {
  const harness = createDeps({
    moderation: {
      categories: { sexual: true },
      checkedAt: "2026-07-16T15:00:00.000Z",
      error: null,
      model: "omni-moderation-latest",
      scores: { sexual: 0.98 },
      status: "flagged",
    },
  });

  const response = await handleAdminNoticeboardSaveRequest(
    createSaveRequest({
      image: new File(["image"], "notice.png", { type: "image/png" }),
    }),
    harness.saveDeps,
  );
  const payload = await readJson(response);

  assert.equal(response.status, 422);
  assert.equal(
    payload.error,
    "That image could not be added to the noticeboard post. Please choose a different image.",
  );
  assert.equal(harness.logCalls, 1);
  assert.equal(harness.saveCalls, 0);
});

test("fails closed when noticeboard image moderation errors", async () => {
  const harness = createDeps({
    moderation: {
      categories: null,
      checkedAt: "2026-07-16T15:00:00.000Z",
      error: "timeout",
      model: "omni-moderation-latest",
      scores: null,
      status: "error",
    },
  });

  const response = await handleAdminNoticeboardSaveRequest(
    createSaveRequest({
      image: new File(["image"], "notice.png", { type: "image/png" }),
    }),
    harness.saveDeps,
  );
  const payload = await readJson(response);

  assert.equal(response.status, 503);
  assert.equal(
    payload.error,
    "Image moderation is temporarily unavailable. The post has not been published.",
  );
  assert.equal(harness.logCalls, 1);
  assert.equal(harness.saveCalls, 0);
});

test("rejects non-admin noticeboard writes", async () => {
  const harness = createDeps({
    role: "user",
  });

  const response = await handleAdminNoticeboardSaveRequest(
    createSaveRequest({
      image: new File(["image"], "notice.png", { type: "image/png" }),
    }),
    harness.saveDeps,
  );
  const payload = await readJson(response);

  assert.equal(response.status, 403);
  assert.equal(payload.error, "You do not have permission to manage noticeboard posts.");
});

test("allows deleting noticeboard posts through the admin route", async () => {
  const harness = createDeps();
  const response = await handleAdminNoticeboardDeleteRequest(
    createDeleteRequest("post-123"),
    harness.deleteDeps,
  );
  const payload = await readJson(response);

  assert.equal(response.status, 200);
  assert.equal(payload.message, "Noticeboard post deleted.");
  assert.equal(harness.deleteCalls, 1);
});
