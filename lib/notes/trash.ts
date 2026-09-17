import { createClient } from "@/lib/supabase/server";
import { displayTitle } from "@/lib/notes/display";
import { getMessages } from "@/lib/i18n/server";
import type { NoteFormat } from "@/lib/notes/types";

export interface TrashEntry {
  id: string;
  kind: "folder" | "note";
  title: string;
  /** 노트일 때만 있다. 어떤 형식이었는지 휴지통에서도 보여준다. */
  format?: NoteFormat;
  deletedAt: string;
  /** 폴더일 때, 함께 들어온 하위 폴더와 노트의 수. */
  sweptCount: number;
}

/**
 * 휴지통 목록. 사용자가 직접 지운 것(trash_root_id = id)만 한 줄로 보여주고,
 * 그때 함께 딸려 들어온 것들은 개수로만 알린다.
 */
export async function listTrash(): Promise<TrashEntry[]> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return [];

  const [{ data: folders }, { data: notes }] = await Promise.all([
    supabase
      .from("folders")
      .select("id, name, deleted_at, trash_root_id")
      .eq("owner_id", user.id)
      .not("deleted_at", "is", null),
    supabase
      .from("notes")
      .select("id, title, preview, format, deleted_at, trash_root_id")
      .eq("owner_id", user.id)
      .not("deleted_at", "is", null),
  ]);

  const { t } = await getMessages();
  const folderRows = folders ?? [];
  const noteRows = notes ?? [];

  // 뿌리마다 함께 들어온 것이 몇 개인지 센다.
  const swept = new Map<string, number>();
  for (const row of [...folderRows, ...noteRows]) {
    if (!row.trash_root_id || row.trash_root_id === row.id) continue;
    swept.set(row.trash_root_id, (swept.get(row.trash_root_id) ?? 0) + 1);
  }

  const entries: TrashEntry[] = [
    ...folderRows
      .filter((row) => row.trash_root_id === row.id)
      .map((row) => ({
        id: row.id as string,
        kind: "folder" as const,
        title: row.name as string,
        deletedAt: row.deleted_at as string,
        sweptCount: swept.get(row.id as string) ?? 0,
      })),
    ...noteRows
      .filter((row) => row.trash_root_id === row.id)
      .map((row) => ({
        id: row.id as string,
        kind: "note" as const,
        title: displayTitle(
          {
            title: row.title as string,
            preview: row.preview as string,
            format: row.format as NoteFormat,
          },
          t,
        ),
        format: row.format as NoteFormat,
        deletedAt: row.deleted_at as string,
        sweptCount: 0,
      })),
  ];

  // 최근에 지운 것이 위로 온다.
  return entries.sort((a, b) => b.deletedAt.localeCompare(a.deletedAt));
}
