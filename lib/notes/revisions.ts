import type { NoteContent, NoteFormat } from "@/lib/notes/types";

export interface RevisionSummary {
  id: string;
  title: string;
  savedAt: string;
}

export interface NoteRevision extends RevisionSummary {
  format: NoteFormat;
  content: NoteContent;
}

export interface RestoredNote {
  title: string;
  content: NoteContent;
  version: number;
  updatedAt: string;
}

export type RestoreRevisionResult =
  | { status: "restored"; note: RestoredNote }
  | { status: "conflict"; latest: RestoredNote }
  | { status: "missing" | "error" | "unsaved" };
