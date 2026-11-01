import { createClient, currentUser } from "@/lib/supabase/server";
import { BACKGROUND_BUCKET } from "./background";
import {
  BackupError,
  MAX_BACKUP_BYTES,
  MAX_EXPANDED_BYTES,
  backupHash,
  backupImageMime,
  decodeBackup,
  encodeBackup,
  isBackupId,
  summarizeBackup,
} from "./backup-file";
import { validateBackupManifest } from "./backup-manifest";
import type { BackupProblem, BackupRestored, NoteBackup } from "./backup-types";

async function session() {
  const user = await currentUser();
  if (!user) throw new BackupError("loginRequired");
  return { user, db: await createClient() };
}

/** 서버 저장본을 하나의 DB 스냅샷으로 읽는다. 이미지도 실제 파일을 함께 담는다. */
export async function downloadNoteBackup() {
  const { user, db } = await session();
  const { data, error } = await db.rpc("create_note_backup");
  if (error || !data) throw new BackupError("exportFailed");
  const manifest: NoteBackup = { ...data, images: [] };
  const sourceToFile = new Map<string, string>();
  const images: Record<string, Uint8Array> = {};
  let expanded = new TextEncoder().encode(JSON.stringify(data)).byteLength;
  for (const note of manifest.notes) {
    if (note.background.kind !== "image") continue;
    const source = note.background.path;
    if (!source.startsWith(`${user.id}/`))
      throw new BackupError("exportFailed");
    let path = sourceToFile.get(source);
    if (!path) {
      const { data: file, error } = await db.storage
        .from(BACKGROUND_BUCKET)
        .download(source);
      if (error || !file) throw new BackupError("exportFailed");
      const bytes = new Uint8Array(await file.arrayBuffer());
      expanded += bytes.byteLength;
      if (expanded > MAX_EXPANDED_BYTES) throw new BackupError("tooLarge");
      const mime = backupImageMime(bytes);
      if (!mime) throw new BackupError("exportFailed");
      path = `images/${crypto.randomUUID()}.${mime === "image/png" ? "png" : "jpg"}`;
      sourceToFile.set(source, path);
      images[path] = bytes;
      manifest.images.push({ path, mime, sha256: backupHash(bytes) });
    }
    note.background = { kind: "image", path };
  }
  validateBackupManifest(manifest);
  return encodeBackup(manifest, images);
}

async function readFile(request: Request) {
  const reader = request.body?.getReader();
  if (!reader) throw new BackupError("invalid");
  const chunks: Uint8Array[] = [];
  let size = 0;
  while (true) {
    const chunk = await reader.read();
    if (chunk.done) break;
    size += chunk.value.byteLength;
    if (size > MAX_BACKUP_BYTES) {
      await reader.cancel();
      throw new BackupError("tooLarge");
    }
    chunks.push(chunk.value);
  }
  const bytes = new Uint8Array(size);
  let offset = 0;
  for (const chunk of chunks) {
    bytes.set(chunk, offset);
    offset += chunk.byteLength;
  }
  return decodeBackup(bytes);
}

export async function inspectNoteBackup(request: Request) {
  await session();
  const { manifest } = await readFile(request);
  return summarizeBackup(manifest);
}

export async function restoreNoteBackup(
  request: Request,
): Promise<BackupRestored> {
  const { user, db } = await session();
  const params = new URL(request.url).searchParams;
  const restoreId = params.get("requestId");
  const folderName = params.get("name")?.trim();
  if (!isBackupId(restoreId) || !folderName || folderName.length > 200)
    throw new BackupError("invalid");
  const { manifest, images } = await readFile(request);
  const imagePaths = new Map(
    manifest.images.map((image) => [
      image.path,
      `${user.id}/backup-${restoreId}/${image.sha256}.${image.mime === "image/png" ? "png" : "jpg"}`,
    ]),
  );
  for (const note of manifest.notes) {
    if (note.background.kind === "image")
      note.background = {
        kind: "image",
        path: imagePaths.get(note.background.path)!,
      };
  }
  const input = {
    payload: manifest,
    restore_id: restoreId,
    folder_name: folderName,
  };
  // 응답을 받지 못해 재시도하면 이미지를 다시 쓰지 않고 완료된 결과를 돌려준다.
  const previous = await db.rpc("restore_note_backup", {
    ...input,
    check_only: true,
  });
  if (previous.error) throw new BackupError("restoreFailed");
  if (previous.data) return previous.data as BackupRestored;
  for (const image of manifest.images) {
    const { error } = await db.storage
      .from(BACKGROUND_BUCKET)
      .upload(imagePaths.get(image.path)!, images[image.path], {
        contentType: image.mime,
        upsert: true,
      });
    if (error) throw new BackupError("restoreFailed");
  }
  // 폴더·노트·이력은 하나의 DB 트랜잭션으로 추가한다. 원본 ID는 쓰지 않는다.
  const { data, error } = await db.rpc("restore_note_backup", {
    ...input,
    check_only: false,
  });
  if (error || !data) throw new BackupError("restoreFailed");
  return data as BackupRestored;
}

export function backupFailure(error: unknown, fallback: BackupProblem) {
  const code = error instanceof BackupError ? error.code : fallback;
  const status =
    code === "loginRequired"
      ? 401
      : code === "tooLarge"
        ? 413
        : ["invalid", "unsupported"].includes(code)
          ? 400
          : 500;
  return Response.json(
    { code },
    { status, headers: { "Cache-Control": "private, no-store" } },
  );
}

export function acceptsBackupRequest(request: Request) {
  const origin = request.headers.get("origin");
  return !origin || origin === new URL(request.url).origin;
}
