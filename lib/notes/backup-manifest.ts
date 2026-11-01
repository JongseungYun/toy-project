import { isNoteFormat, type NoteContent, type NoteFormat } from "./types";
import { BACKGROUND_COLORS, type NoteBackground } from "./background";
import type { CanvasElement } from "./canvas";
import type {
  BackupFolder,
  BackupImage,
  BackupNote,
  BackupRevision,
  NoteBackup,
} from "./backup-types";
import { backupHtml } from "./backup-html";

// 파일 입력의 구조 검증. 실행 코드의 손질은 backup-file에서 별도로 한다.
function check(condition: unknown): asserts condition {
  if (!condition) throw Error("잘못된 백업 구조");
}
function record(value: unknown): Record<string, unknown> {
  check(value && typeof value === "object" && !Array.isArray(value));
  return value as Record<string, unknown>;
}
function text(value: unknown): string {
  check(typeof value === "string");
  return value;
}
function id(value: unknown): string {
  const v = text(value);
  check(/^[0-9a-f]{8}-(?:[0-9a-f]{4}-){3}[0-9a-f]{12}$/i.test(v));
  return v;
}
function maybeId(value: unknown) {
  return value === null ? null : id(value);
}
function stamp(value: unknown) {
  const v = text(value);
  check(/^\d{4}-\d{2}-\d{2}T/.test(v) && Number.isFinite(Date.parse(v)));
  return v;
}
function integer(value: unknown) {
  check(typeof value === "number" && Number.isSafeInteger(value) && value >= 1);
  return value;
}
function bool(value: unknown) {
  check(typeof value === "boolean");
  return value;
}
function rows(value: unknown) {
  check(Array.isArray(value));
  return value.map(record);
}
function format(value: unknown): NoteFormat {
  check(isNoteFormat(value));
  return value;
}
function times(row: Record<string, unknown>) {
  return {
    created_at: stamp(row.created_at),
    updated_at: stamp(row.updated_at),
    deleted_at: row.deleted_at === null ? null : stamp(row.deleted_at),
    trash_root_id: maybeId(row.trash_root_id),
  };
}
function content(kind: NoteFormat, value: unknown): NoteContent {
  const row = record(value);
  if (kind === "doc")
    return { html: backupHtml(row.html === undefined ? "" : text(row.html)) };
  if (kind === "markdown")
    return {
      source: row.source === undefined ? "" : text(row.source),
      viewer: row.viewer === undefined ? true : bool(row.viewer),
    };
  const elements = row.elements === undefined ? [] : rows(row.elements);
  const seen = new Set<string>();
  for (const element of elements) {
    const key = text(element.id);
    check(!seen.has(key));
    seen.add(key);
    text(element.color);
    const finite = (v: unknown) =>
      check(typeof v === "number" && Number.isFinite(v));
    if (element.kind === "text") {
      text(element.text);
      finite(element.x);
      finite(element.y);
      finite(element.size);
      check((element.size as number) > 0);
    } else {
      finite(element.width);
      check((element.width as number) > 0);
      if (element.kind === "pen") {
        check(
          Array.isArray(element.points) &&
            element.points.length >= 2 &&
            element.points.length % 2 === 0,
        );
        element.points.forEach(finite);
      } else {
        check(
          ["rect", "ellipse", "line", "arrow"].includes(text(element.kind)),
        );
        [element.x1, element.y1, element.x2, element.y2].forEach(finite);
      }
    }
  }
  return { elements: elements as unknown as CanvasElement[] };
}
function background(value: unknown): NoteBackground {
  const row = record(value);
  if (row.kind === "image") return { kind: "image", path: text(row.path) };
  check(
    row.kind === "color" &&
      BACKGROUND_COLORS.some((color) => color.value === row.value),
  );
  return { kind: "color", value: text(row.value) };
}

export function validateBackupManifest(value: unknown): NoteBackup {
  const row = record(value);
  check(row.format === "amu-note-backup" && row.version === 1);
  const folders: BackupFolder[] = rows(row.folders).map((f) => ({
    id: id(f.id),
    parent_id: maybeId(f.parent_id),
    name: text(f.name),
    ...times(f),
  }));
  const notes: BackupNote[] = rows(row.notes).map((n) => ({
    id: id(n.id),
    folder_id: maybeId(n.folder_id),
    format: format(n.format),
    title: text(n.title),
    content: content(format(n.format), n.content),
    preview: text(n.preview),
    version: integer(n.version),
    is_pinned: bool(n.is_pinned),
    background: background(n.background),
    ...times(n),
  }));
  const revisions: BackupRevision[] = rows(row.revisions).map((r) => {
    check(r.kind === "initial" || r.kind === "auto" || r.kind === "restore");
    return {
      id: id(r.id),
      note_id: id(r.note_id),
      format: format(r.format),
      title: text(r.title),
      content: content(format(r.format), r.content),
      preview: text(r.preview),
      version: integer(r.version),
      kind: r.kind,
      saved_at: stamp(r.saved_at),
      created_at: stamp(r.created_at),
    };
  });
  const images = rows(row.images).map((image): BackupImage => {
    check(image.mime === "image/png" || image.mime === "image/jpeg");
    check(
      typeof image.sha256 === "string" && /^[0-9a-f]{64}$/.test(image.sha256),
    );
    return { path: text(image.path), mime: image.mime, sha256: image.sha256 };
  });
  const all = new Set([...folders, ...notes].map((item) => item.id));
  check(all.size === folders.length + notes.length);
  const byFolder = new Map(folders.map((f) => [f.id, f]));
  const byNote = new Map(notes.map((n) => [n.id, n]));
  for (const item of [...folders, ...notes])
    check(!item.trash_root_id || all.has(item.trash_root_id));
  const resolved = new Set<string>();
  for (const folder of folders) {
    let current: string | null = folder.id;
    const branch = new Set<string>();
    while (current && !resolved.has(current)) {
      check(!branch.has(current) && byFolder.has(current));
      branch.add(current);
      current = byFolder.get(current)!.parent_id;
    }
    branch.forEach((key) => resolved.add(key));
  }
  const imageKeys = new Set(images.map((image) => image.path));
  check(imageKeys.size === images.length);
  const usedImages = new Set<string>();
  for (const note of notes) {
    check(!note.folder_id || byFolder.has(note.folder_id));
    if (note.background.kind === "image") {
      check(imageKeys.has(note.background.path));
      usedImages.add(note.background.path);
    }
  }
  check(usedImages.size === images.length);
  const revisionIds = new Set<string>();
  const noteVersions = new Map<string, Set<number>>();
  for (const revision of revisions) {
    check(!revisionIds.has(revision.id));
    revisionIds.add(revision.id);
    const note = byNote.get(revision.note_id);
    check(
      note &&
        note.format === revision.format &&
        revision.version < note.version,
    );
    const versions = noteVersions.get(note.id) ?? new Set<number>();
    check(!versions.has(revision.version));
    versions.add(revision.version);
    check(versions.size <= 50);
    noteVersions.set(note.id, versions);
  }
  return {
    format: "amu-note-backup",
    version: 1,
    created_at: stamp(row.created_at),
    folders,
    notes,
    revisions,
    images,
  };
}
