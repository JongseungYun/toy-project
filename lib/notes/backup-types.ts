import type { NoteBackground } from "@/lib/notes/background";
import type { NoteContent, NoteFormat } from "@/lib/notes/types";

export const MAX_BACKUP_BYTES = 64 * 1024 * 1024;

interface BackupTimes {
  created_at: string;
  updated_at: string;
  deleted_at: string | null;
  trash_root_id: string | null;
}
export interface BackupFolder extends BackupTimes {
  id: string;
  parent_id: string | null;
  name: string;
}
export interface BackupNote extends BackupTimes {
  id: string;
  folder_id: string | null;
  format: NoteFormat;
  title: string;
  content: NoteContent;
  preview: string;
  version: number;
  is_pinned: boolean;
  background: NoteBackground;
}
export interface BackupRevision {
  id: string;
  note_id: string;
  format: NoteFormat;
  title: string;
  content: NoteContent;
  preview: string;
  version: number;
  kind: "initial" | "auto" | "restore";
  saved_at: string;
  created_at: string;
}
export interface BackupImage {
  path: string;
  mime: "image/png" | "image/jpeg";
  sha256: string;
}
export interface NoteBackup {
  format: "amu-note-backup";
  version: 1;
  created_at: string;
  folders: BackupFolder[];
  notes: BackupNote[];
  revisions: BackupRevision[];
  images: BackupImage[];
}
export interface BackupSummary {
  createdAt: string;
  folders: number;
  notes: number;
  trash: number;
  revisions: number;
  images: number;
}
export interface BackupRestored {
  root_id: string;
  name: string;
}
export type BackupProblem =
  | "invalid"
  | "unsupported"
  | "tooLarge"
  | "inspectFailed"
  | "exportFailed"
  | "restoreFailed"
  | "loginRequired";
