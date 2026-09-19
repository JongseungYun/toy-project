import { cache } from "react";
import { createClient, currentUser } from "@/lib/supabase/server";
import { isShareToken } from "@/lib/notes/share";
import { sortColumn, type ResolvedSort } from "@/lib/notes/sort";
import type { Note, NoteContent, NoteFormat, NoteSummary } from "@/lib/notes/types";

interface NoteRow {
  id: string;
  folder_id: string | null;
  background: unknown;
  share_token: string | null;
  format: Note["format"];
  title: string;
  preview: string;
  content: Note["content"];
  version: number;
  created_at: string;
  updated_at: string;
}

// 배경도 목록이 함께 읽는다. 좌측 목록의 썸네일이 노트와 같은 배경을 입는다.
const SUMMARY_COLUMNS =
  "id, format, title, preview, version, created_at, updated_at, background";

function toSummary(
  row: Omit<NoteRow, "content" | "folder_id" | "share_token">,
): NoteSummary {
  return {
    id: row.id,
    format: row.format,
    title: row.title,
    preview: row.preview,
    version: row.version,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
    background: row.background,
  };
}

/**
 * 지금 로그인한 사람의 노트 목록.
 * 소유자 제한은 RLS가 걸지만, 인덱스를 타도록 owner_id 조건도 함께 준다.
 */
export async function listNotes(
  sort: ResolvedSort,
  folderId: string | null = null,
): Promise<NoteSummary[]> {
  const user = await currentUser();
  if (!user) return [];

  const supabase = await createClient();
  let query = supabase
    .from("notes")
    .select(SUMMARY_COLUMNS)
    .eq("owner_id", user.id)
    // 휴지통에 있는 노트는 보관함 목록에 나오지 않는다.
    .is("deleted_at", null);

  query = folderId ? query.eq("folder_id", folderId) : query.is("folder_id", null);

  const { data, error } = await query
    .order(sortColumn(sort.key), { ascending: sort.ascending })
    .order("id", { ascending: true });

  if (error || !data) return [];
  return data.map(toSummary);
}

/**
 * 노트 하나를 본문까지 읽는다. 내 노트가 아니면 RLS가 걸러 null이 된다.
 * 휴지통에 있는 노트도 열리지 않는다. 되돌리기는 휴지통 화면에서 한다.
 *
 * 제목을 지을 때와 화면을 그릴 때 같은 노트를 각각 부르므로, 같은 요청 안에서는
 * 한 번만 읽는다.
 */
export const getNote = cache(async (id: string): Promise<Note | null> => {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("notes")
    .select(`${SUMMARY_COLUMNS}, content, folder_id, share_token`)
    .eq("id", id)
    .is("deleted_at", null)
    .maybeSingle<NoteRow>();

  if (error || !data) return null;
  return {
    ...toSummary(data),
    content: data.content ?? {},
    folderId: data.folder_id ?? null,
    shareToken: data.share_token ?? null,
  };
});

/**
 * 링크로 열어 주는 노트. 편집에 필요한 것(version, 폴더, 소유자)은 담지 않는다.
 * 읽는 사람에게 필요한 만큼만 넘어온다.
 */
export interface SharedNote {
  id: string;
  format: NoteFormat;
  title: string;
  preview: string;
  content: NoteContent;
  background: unknown;
  updatedAt: string;
}

interface SharedRow {
  id: string;
  format: NoteFormat;
  title: string;
  preview: string;
  content: NoteContent | null;
  background: unknown;
  updated_at: string;
}

/**
 * 열쇠로 노트 하나를 읽는다. 공유를 끄지 않았고 휴지통에도 없는 노트만 나온다.
 *
 * 로그인하지 않은 사람도 부르므로 소유자 조건이 걸린 표를 바로 보지 않고,
 * 열쇠를 받아 그 한 행만 내주는 함수를 통해 읽는다.
 * supabase/migrations/0006_note_sharing.sql 참고.
 */
export async function getSharedNote(token: string): Promise<SharedNote | null> {
  if (!isShareToken(token)) return null;

  const supabase = await createClient();
  const { data, error } = await supabase
    .rpc("shared_note", { token })
    .maybeSingle<SharedRow>();

  if (error || !data) return null;

  return {
    id: data.id,
    format: data.format,
    title: data.title,
    preview: data.preview,
    content: data.content ?? {},
    background: data.background,
    updatedAt: data.updated_at,
  };
}
