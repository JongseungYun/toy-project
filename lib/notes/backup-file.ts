import { createHash } from "node:crypto";
import { strFromU8, strToU8, unzipSync, zipSync, type Zippable } from "fflate";
import {
  MAX_BACKUP_BYTES,
  type BackupProblem,
  type BackupSummary,
  type NoteBackup,
} from "./backup-types";
import { validateBackupManifest } from "./backup-manifest";
import { MAX_BYTES } from "./background";

export { MAX_BACKUP_BYTES } from "./backup-types";
export const MAX_EXPANDED_BYTES = 128 * 1024 * 1024;
export const isBackupId = (value: unknown): value is string =>
  typeof value === "string" &&
  /^[0-9a-f]{8}-(?:[0-9a-f]{4}-){3}[0-9a-f]{12}$/i.test(value);
const imagePath = /^images\/[0-9a-f-]{36}\.(png|jpg)$/;
export const backupHash = (bytes: Uint8Array) =>
  createHash("sha256").update(bytes).digest("hex");
export function backupImageMime(
  bytes: Uint8Array,
): "image/png" | "image/jpeg" | null {
  if (
    bytes[0] === 137 &&
    bytes[1] === 80 &&
    bytes[2] === 78 &&
    bytes[3] === 71 &&
    bytes[4] === 13 &&
    bytes[5] === 10 &&
    bytes[6] === 26 &&
    bytes[7] === 10
  )
    return "image/png";
  if (bytes[0] === 255 && bytes[1] === 216 && bytes[2] === 255)
    return "image/jpeg";
  return null;
}

export class BackupError extends Error {
  constructor(public code: BackupProblem) {
    super(code);
  }
}
function requireValid(condition: unknown): asserts condition {
  if (!condition) throw new BackupError("invalid");
}

export function encodeBackup(
  manifest: NoteBackup,
  images: Record<string, Uint8Array>,
): Uint8Array {
  const body = strToU8(JSON.stringify(manifest));
  const files: Zippable = {
    "manifest.json": body,
    "manifest.sha256": strToU8(backupHash(body)),
  };
  let size = body.byteLength;
  for (const item of manifest.images) {
    const image = images[item.path];
    requireValid(image && backupHash(image) === item.sha256);
    files[item.path] = [image, { level: 0 }];
    size += image.byteLength;
  }
  if (size > MAX_EXPANDED_BYTES) throw new BackupError("tooLarge");
  const result = zipSync(files, { level: 1 });
  if (result.byteLength > MAX_BACKUP_BYTES) throw new BackupError("tooLarge");
  return result;
}

/** ZIP을 디스크에 풀지 않는다. 전용 명세·이미지만 메모리에서 확인한다. */
export function decodeBackup(bytes: Uint8Array): {
  manifest: NoteBackup;
  images: Record<string, Uint8Array>;
} {
  if (bytes.byteLength > MAX_BACKUP_BYTES) throw new BackupError("tooLarge");
  try {
    let expanded = 0;
    const names = new Set<string>();
    const files = unzipSync(bytes, {
      filter(entry) {
        requireValid(!names.has(entry.name));
        names.add(entry.name);
        requireValid(
          entry.name === "manifest.json" ||
            entry.name === "manifest.sha256" ||
            imagePath.test(entry.name),
        );
        expanded += entry.originalSize;
        if (expanded > MAX_EXPANDED_BYTES) throw new BackupError("tooLarge");
        return true;
      },
    });
    requireValid(files["manifest.json"] && files["manifest.sha256"]);
    requireValid(
      backupHash(files["manifest.json"]) ===
        strFromU8(files["manifest.sha256"]),
    );
    const raw = JSON.parse(strFromU8(files["manifest.json"]));
    if (raw?.format !== "amu-note-backup" || raw?.version !== 1)
      throw new BackupError("unsupported");
    const manifest = validateBackupManifest(raw);
    const images: Record<string, Uint8Array> = {};
    for (const item of manifest.images) {
      requireValid(imagePath.test(item.path) && files[item.path]);
      const bytes = files[item.path];
      requireValid(
        bytes.byteLength <= MAX_BYTES && backupHash(bytes) === item.sha256,
      );
      requireValid(backupImageMime(bytes) === item.mime);
      requireValid(
        item.mime === "image/png"
          ? item.path.endsWith(".png")
          : item.path.endsWith(".jpg"),
      );
      images[item.path] = bytes;
    }
    requireValid(Object.keys(files).length === manifest.images.length + 2);
    return { manifest, images };
  } catch (error) {
    throw error instanceof BackupError ? error : new BackupError("invalid");
  }
}

export function summarizeBackup(manifest: NoteBackup): BackupSummary {
  return {
    createdAt: manifest.created_at,
    folders: manifest.folders.filter((item) => !item.deleted_at).length,
    notes: manifest.notes.filter((item) => !item.deleted_at).length,
    trash: [...manifest.folders, ...manifest.notes].filter(
      (item) => !!item.deleted_at,
    ).length,
    revisions: manifest.revisions.length,
    images: manifest.images.length,
  };
}
