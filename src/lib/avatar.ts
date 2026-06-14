export const AVATAR_BUCKET = "avatars";
export const AVATAR_MAX_UPLOAD_BYTES = 5 * 1024 * 1024;
export const AVATAR_OUTPUT_SIZE = 512;
export const AVATAR_OUTPUT_QUALITY = 0.8;
export const AVATAR_ACCEPTED_TYPES = [
  "image/jpeg",
  "image/png",
  "image/webp",
] as const;

export function isSupportedAvatarType(type: string) {
  return AVATAR_ACCEPTED_TYPES.includes(type as (typeof AVATAR_ACCEPTED_TYPES)[number]);
}

export function getAvatarPath(userId: string) {
  return `${userId}/avatar.webp`;
}

export function getAvatarInitials(name: string | null | undefined) {
  const value = name?.trim() || "?";
  const parts = value.split(/\s+/).filter(Boolean).slice(0, 2);

  if (parts.length === 0) {
    return "?";
  }

  return parts
    .map((part) => part[0]?.toUpperCase() ?? "")
    .join("")
    .slice(0, 2);
}

async function loadImage(file: File) {
  const objectUrl = URL.createObjectURL(file);

  try {
    return await new Promise<HTMLImageElement>((resolve, reject) => {
      const image = new Image();
      image.onload = () => resolve(image);
      image.onerror = () => reject(new Error("Could not read that image file."));
      image.src = objectUrl;
    });
  } finally {
    URL.revokeObjectURL(objectUrl);
  }
}

export async function processAvatarFile(file: File) {
  const image = await loadImage(file);
  const canvas = document.createElement("canvas");
  canvas.width = AVATAR_OUTPUT_SIZE;
  canvas.height = AVATAR_OUTPUT_SIZE;

  const context = canvas.getContext("2d");

  if (!context) {
    throw new Error("Your browser could not prepare the avatar image.");
  }

  const cropSize = Math.min(image.naturalWidth, image.naturalHeight);
  const cropX = Math.max((image.naturalWidth - cropSize) / 2, 0);
  const cropY = Math.max((image.naturalHeight - cropSize) / 2, 0);

  context.drawImage(
    image,
    cropX,
    cropY,
    cropSize,
    cropSize,
    0,
    0,
    AVATAR_OUTPUT_SIZE,
    AVATAR_OUTPUT_SIZE,
  );

  const blob = await new Promise<Blob>((resolve, reject) => {
    canvas.toBlob(
      (nextBlob) => {
        if (!nextBlob) {
          reject(new Error("Could not compress the avatar image."));
          return;
        }

        resolve(nextBlob);
      },
      "image/webp",
      AVATAR_OUTPUT_QUALITY,
    );
  });

  return blob;
}
