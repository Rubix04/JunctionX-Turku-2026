import { randomUUID } from "node:crypto";
import { createReadStream } from "node:fs";
import { mkdir, rm, stat, writeFile } from "node:fs/promises";
import { join } from "node:path";

import sharp from "sharp";

import { badRequest } from "../../errors.js";

// Photos and videos attached to a daily log (spec 1), e.g. a video of limping for the vet.

export const MAX_IMAGE_BYTES = 15 * 1024 * 1024;
export const MAX_VIDEO_BYTES = 50 * 1024 * 1024;
export const MAX_ATTACHMENTS_PER_LOG = 3;

const IMAGE_MAX_SIDE = 1600;
const IMAGE_FORMATS = new Set(["jpeg", "png", "webp", "heif", "avif"]);

const attachmentDir = (uploadDir: string) => join(uploadDir, "log-attachments");

/** Keys are generated here, but check anyway so a bad key can't leave the folder. */
const attachmentPath = (uploadDir: string, key: string) => {
  if (!/^[0-9a-f-]{36}\.(webp|mp4|mov|webm)$/.test(key)) {
    throw new Error(`Invalid attachment key: ${key}`);
  }
  return join(attachmentDir(uploadDir), key);
};

/** Recognises the video containers phones record, from the file's first bytes. */
const videoTypeOf = (data: Buffer) => {
  if (data.length >= 12 && data.toString("latin1", 4, 8) === "ftyp") {
    return data.toString("latin1", 8, 12) === "qt  "
      ? { contentType: "video/quicktime", extension: "mov" }
      : { contentType: "video/mp4", extension: "mp4" };
  }
  if (data.length >= 4 && data.readUInt32BE(0) === 0x1a45dfa3) {
    return { contentType: "video/webm", extension: "webm" };
  }
  return null;
};

export type StoredAttachment = {
  fileKey: string;
  mediaType: "image" | "video";
  contentType: string;
  sizeBytes: number;
};

/**
 * Stores an uploaded photo or video. Photos are turned upright, scaled down and re-encoded as
 * WebP, which also drops EXIF metadata such as the GPS location. Videos are stored as they are.
 */
export const storeAttachment = async (uploadDir: string, data: Buffer): Promise<StoredAttachment> => {
  const video = videoTypeOf(data);
  let output: Buffer;
  let stored: Omit<StoredAttachment, "fileKey" | "sizeBytes"> & { extension: string };

  if (video) {
    if (data.length > MAX_VIDEO_BYTES) {
      throw badRequest("FILE_TOO_LARGE", "Videos can be at most 50 MB");
    }
    output = data;
    stored = { mediaType: "video", ...video };
  } else {
    if (data.length > MAX_IMAGE_BYTES) {
      throw badRequest("FILE_TOO_LARGE", "Photos can be at most 15 MB");
    }
    try {
      const metadata = await sharp(data).metadata();
      if (!metadata.format || !IMAGE_FORMATS.has(metadata.format)) {
        throw new Error("unsupported");
      }
      output = await sharp(data)
        .rotate()
        .resize(IMAGE_MAX_SIDE, IMAGE_MAX_SIDE, { fit: "inside", withoutEnlargement: true })
        .webp({ quality: 80 })
        .toBuffer();
    } catch {
      throw badRequest("INVALID_ATTACHMENT", "Upload a photo (JPEG, PNG, WebP, HEIC) or a video (MP4, MOV, WebM)");
    }
    stored = { mediaType: "image", contentType: "image/webp", extension: "webp" };
  }

  await mkdir(attachmentDir(uploadDir), { recursive: true });
  const fileKey = `${randomUUID()}.${stored.extension}`;
  await writeFile(attachmentPath(uploadDir, fileKey), output);
  return { fileKey, mediaType: stored.mediaType, contentType: stored.contentType, sizeBytes: output.length };
};

/**
 * Opens an attachment, optionally for a byte range (`Range: bytes=start-end`). Video players,
 * iOS's in particular, ask for ranges. Returns null for a range that can't be satisfied.
 */
export const openAttachment = async (uploadDir: string, key: string, range?: string) => {
  const path = attachmentPath(uploadDir, key);
  const { size } = await stat(path);
  const match = range ? /^bytes=(\d*)-(\d*)$/.exec(range) : null;
  if (!match || (match[1] === "" && match[2] === "")) {
    return { stream: createReadStream(path), size, partial: null };
  }
  const start = match[1] === "" ? Math.max(0, size - Number(match[2])) : Number(match[1]);
  const end = match[1] === "" || match[2] === "" ? size - 1 : Math.min(Number(match[2]), size - 1);
  if (start > end || start >= size) {
    return null;
  }
  return { stream: createReadStream(path, { start, end }), size, partial: { start, end } };
};

/** Deletes stored files. Missing files are ignored. */
export const deleteAttachmentFiles = async (uploadDir: string, keys: string[]) => {
  await Promise.all(keys.map((key) => rm(attachmentPath(uploadDir, key), { force: true })));
};
