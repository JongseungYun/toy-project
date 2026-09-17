import { createClient } from "@/lib/supabase/server";
import { sortColumn, type ResolvedSort } from "@/lib/notes/sort";
import type { Note, NoteSummary } from "@/lib/notes/types";

interface NoteRow {
  id: string;
  format: Note["format"];
  title: string;
  preview: string;
  content: Note["content"];
  version: number;
  created_at: string;
  updated_at: string;
}

const SUMMARY_COLUMNS =
  "id, format, title, preview, version, created_at, updated_at";

function toSummary(row: Omit<NoteRow, "content">): NoteSummary {
  return {
    id: row.id,
    format: row.format,
    title: row.title,
    preview: row.preview,
    version: row.version,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

/**
 * 지금 로그인한 사람의 노트 목록.
 * 소유자 제한은 RLS가 걸지만, 인덱스를 타도록 owner_id 조건도 함께 준다.
 */
export async function listNotes(sort: ResolvedSort): Promise<NoteSummary[]> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return [];

  const { data, error } = await supabase
    .from("notes")
    .select(SUMMARY_COLUMNS)
    .eq("owner_id", user.id)
    .order(sortColumn(sort.key), { ascending: sort.ascending })
    .order("id", { ascending: true });

  if (error || !data) return [];
  return data.map(toSummary);
}

/** 노트 하나를 본문까지 읽는다. 내 노트가 아니면 RLS가 걸러 null이 된다. */
export async function getNote(id: string): Promise<Note | null> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("notes")
    .select(`${SUMMARY_COLUMNS}, content`)
    .eq("id", id)
    .maybeSingle<NoteRow>();

  if (error || !data) return null;
  return { ...toSummary(data), content: data.content ?? {} };
}
