import assert from "node:assert/strict";
import test from "node:test";
import { handleAvatarUploadRequest } from "../src/lib/account/handle-avatar-upload-request";
import type { ImageModerationDecision } from "../src/lib/media/image-moderation";

function createAvatarRequest(file: File, includeAuth = true) {
  const formData = new FormData();
  formData.append("avatar", file);

  return new Request("http://localhost/api/account/avatar", {
    body: formData,
    headers: includeAuth
      ? {
          Authorization: "Bearer avatar-token",
        }
      : undefined,
    method: "POST",
  });
}

function createDeps(overrides?: {
  moderation?: ImageModerationDecision;
  saveAvatar?: () => Promise<{ avatarUrl: string }>;
  userFound?: boolean;
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

  let logCalls = 0;
  let saveCalls = 0;

  return {
    deps: {
      async getUserFromAccessToken(accessToken: string) {
        assert.equal(accessToken, "avatar-token");

        if (overrides?.userFound === false) {
          return null;
        }

        return {
          email: "creator@example.com",
          id: "59f55a03-0b3a-4d55-a03d-b98d8e1fbc10",
          role: "user" as const,
        };
      },
      async logImageModeration(input: {
        actorEmail: string | null;
        actorRole: "user" | "admin";
        actorUserId: string;
        metadata: {
          contentType: string;
          fileName: string | null;
          sha256: string;
          sizeBytes: number;
        };
        moderation: ImageModerationDecision;
        targetType: "avatar";
      }) {
        logCalls += 1;
        assert.equal(input.actorRole, "user");
        assert.equal(input.targetType, "avatar");
        assert.equal(input.metadata.contentType, "image/webp");
        assert.equal(input.moderation.status, moderation.status);
      },
      async moderateImage(input: { buffer: Buffer; contentType: string }) {
        assert.equal(input.contentType, "image/webp");
        assert.ok(input.buffer.byteLength > 0);
        return moderation;
      },
      async saveAvatar() {
        saveCalls += 1;

        if (overrides?.saveAvatar) {
          return overrides.saveAvatar();
        }

        return {
          avatarUrl: "https://example.com/avatar.webp?v=1",
        };
      },
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

test("uploads a clean avatar image", async () => {
  const harness = createDeps();
  const response = await handleAvatarUploadRequest(
    createAvatarRequest(new File(["avatar"], "avatar.webp", { type: "image/webp" })),
    harness.deps,
  );
  const payload = await readJson(response);

  assert.equal(response.status, 200);
  assert.equal(payload.message, "Profile picture uploaded successfully.");
  assert.equal(payload.avatarUrl, "https://example.com/avatar.webp?v=1");
  assert.equal(harness.logCalls, 1);
  assert.equal(harness.saveCalls, 1);
});

test("blocks flagged avatar images without saving", async () => {
  const harness = createDeps({
    moderation: {
      categories: { sexual: true },
      checkedAt: "2026-07-16T15:00:00.000Z",
      error: null,
      model: "omni-moderation-latest",
      scores: { sexual: 0.96 },
      status: "flagged",
    },
  });

  const response = await handleAvatarUploadRequest(
    createAvatarRequest(new File(["avatar"], "avatar.webp", { type: "image/webp" })),
    harness.deps,
  );
  const payload = await readJson(response);

  assert.equal(response.status, 422);
  assert.equal(
    payload.error,
    "That profile picture could not be uploaded. Please choose a different image.",
  );
  assert.equal(harness.logCalls, 1);
  assert.equal(harness.saveCalls, 0);
});

test("fails closed when avatar moderation errors", async () => {
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

  const response = await handleAvatarUploadRequest(
    createAvatarRequest(new File(["avatar"], "avatar.webp", { type: "image/webp" })),
    harness.deps,
  );
  const payload = await readJson(response);

  assert.equal(response.status, 503);
  assert.equal(
    payload.error,
    "Profile picture moderation is temporarily unavailable. Please try again shortly.",
  );
  assert.equal(harness.logCalls, 1);
  assert.equal(harness.saveCalls, 0);
});

test("rejects unauthenticated avatar uploads", async () => {
  const harness = createDeps();
  const response = await handleAvatarUploadRequest(
    createAvatarRequest(
      new File(["avatar"], "avatar.webp", { type: "image/webp" }),
      false,
    ),
    harness.deps,
  );
  const payload = await readJson(response);

  assert.equal(response.status, 401);
  assert.equal(payload.error, "You must be signed in to update your profile picture.");
});
