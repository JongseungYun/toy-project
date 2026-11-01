"use server";

import { createClient, currentUser } from "@/lib/supabase/server";
import type { ReadResult } from "@/lib/notes/read-result";
import type {
  NoteRevision,
  RevisionSummary,
  RestoreRevisionResult,
} from "@/lib/notes/revisions";

export async function listNoteRevisions(
  noteId: string,
): Promise<ReadResult<RevisionSummary[]>> {
  try {
    const [user, db] = await Promise.all([currentUser(), createClient()]);
    if (!user) return { ok: false };
    const { data, error } = await db
      .from("note_revisions")
      .select("id, title, saved_at")
      .eq("note_id", noteId)
      .eq("owner_id", user.id)
      .order("created_at", { ascending: false })
      .order("version", { ascending: false })
      .limit(50);
    if (error || !data) return { ok: false };
    return {
      ok: true,
      data: data.map((row) => ({
        id: row.id,
        title: row.title,
        savedAt: row.saved_at,
      })),
    };
  } catch {
    return { ok: false };
  }
}

export async function readNoteRevision(
  noteId: string,
  revisionId: string,
): Promise<ReadResult<NoteRevision | null>> {
  try {
    const [user, db] = await Promise.all([currentUser(), createClient()]);
    if (!user) return { ok: false };
    const { data, error } = await db
      .from("note_revisions")
      .select("id, title, saved_at, format, content")
      .eq("id", revisionId)
      .eq("note_id", noteId)
      .eq("owner_id", user.id)
      .maybeSingle();
    if (error) return { ok: false };
    return {
      ok: true,
      data: data
        ? {
            id: data.id,
            title: data.title,
            savedAt: data.saved_at,
            format: data.format,
            content: data.content,
          }
        : null,
    };
  } catch {
    return { ok: false };
  }
}

export async function restoreNoteRevision(
  noteId: string,
  revisionId: string,
  version: number,
): Promise<RestoreRevisionResult> {
  try {
    const [user, db] = await Promise.all([currentUser(), createClient()]);
    if (!user) return { status: "error" };
    const { data, error } = await db.rpc("restore_note_revision", {
      target_note: noteId,
      target_revision: revisionId,
      expected_version: version,
    });
    return error || !data
      ? { status: "error" }
      : (data as RestoreRevisionResult);
  } catch {
    return { status: "error" };
  }
}
