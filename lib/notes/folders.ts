import { cache } from "react";
import { createClient, currentUser } from "@/lib/supabase/server";
import type { ResolvedSort } from "@/lib/notes/sort";

export interface FolderSummary {
  id: string;
  name: string;
  parentId: string | null;
  noteCount: number;
  childFolderCount: number;
  createdAt: string;
  updatedAt: string;
}

export interface Crumb {
  id: string | null;
  name: string;
}

interface FolderRow {
  id: string;
  name: string;
  parent_id: string | null;
  created_at: string;
  updated_at: string;
}

const COLUMNS = "id, name, parent_id, created_at, updated_at";

type Ancestor = Pick<FolderRow, "id" | "name" | "parent_id">;

/**
 * 지우지 않은 내 폴더 전체를 id로 찾을 수 있게 담아 둔다.
 * 상단 경로와 옮길 곳 목록이 같은 목록을 쓰므로, 같은 요청 안에서는 한 번만 읽는다.
 */
const folderIndex = cache(async (): Promise<Map<string, Ancestor>> => {
  const user = await currentUser();
  if (!user) return new Map();

  const supabase = await createClient();
  const { data } = await supabase
    .from("folders")
    .select("id, name, parent_id")
    .eq("owner_id", user.id)
    .is("deleted_at", null);

  return new Map(((data ?? []) as Ancestor[]).map((row) => [row.id, row]));
});

/**
 * 지금 열려 있는 폴더의 하위 폴더. 각 폴더가 무엇을 담고 있는지 알려주려고
 * 한 단계 아래의 개수도 함께 센다.
 */
export async function listFolders(
  parentId: string | null,
  sort: ResolvedSort,
): Promise<FolderSummary[]> {
  const user = await currentUser();
  if (!user) return [];

  const supabase = await createClient();
  let query = supabase
    .from("folders")
    .select(COLUMNS)
    .eq("owner_id", user.id)
    .is("deleted_at", null);

  query = parentId ? query.eq("parent_id", parentId) : query.is("parent_id", null);

  const { data, error } = await query
    // 폴더에는 본문이 없어 "수정일"이 노트와 같은 뜻이 아니다. 제목 기준이면
    // 이름순, 그 밖에는 만든 순으로 두고 방향만 사용자의 선택을 따른다.
    .order(sort.key === "title" ? "name" : "created_at", {
      ascending: sort.ascending,
    })
    .order("id", { ascending: true });

  if (error || !data) return [];

  const ids = data.map((row) => row.id);
  if (ids.length === 0) return [];

  // 개수는 두 번의 조회로 한꺼번에 세고 메모리에서 묶는다. 폴더마다 따로 세면
  // 폴더 수만큼 왕복이 늘어난다.
  const [{ data: notes }, { data: children }] = await Promise.all([
    supabase
      .from("notes")
      .select("folder_id")
      .eq("owner_id", user.id)
      .is("deleted_at", null)
      .in("folder_id", ids),
    supabase
      .from("folders")
      .select("parent_id")
      .eq("owner_id", user.id)
      .is("deleted_at", null)
      .in("parent_id", ids),
  ]);

  const count = (rows: { [key: string]: string | null }[] | null, key: string) => {
    const tally = new Map<string, number>();
    for (const row of rows ?? []) {
      const id = row[key];
      if (id) tally.set(id, (tally.get(id) ?? 0) + 1);
    }
    return tally;
  };

  const noteTally = count(notes, "folder_id");
  const childTally = count(children, "parent_id");

  return (data as FolderRow[]).map((row) => ({
    id: row.id,
    name: row.name,
    parentId: row.parent_id,
    noteCount: noteTally.get(row.id) ?? 0,
    childFolderCount: childTally.get(row.id) ?? 0,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  }));
}

/**
 * 상단 경로. 지금 폴더에서 뿌리까지 거슬러 올라간다.
 * 한 단계씩 조회하면 깊이만큼 왕복이 늘어나므로, 폴더 목록을 한 번 읽고
 * 메모리에서 올라간다. 고리가 생겨도 멈추도록 이미 지난 곳은 건너뛴다.
 */
export async function folderPath(
  folderId: string | null,
  rootLabel: string,
): Promise<Crumb[]> {
  const root: Crumb = { id: null, name: rootLabel };
  if (!folderId) return [root];

  const byId = await folderIndex();
  const crumbs: Crumb[] = [];
  const seen = new Set<string>();
  let current: string | null = folderId;

  while (current && !seen.has(current)) {
    seen.add(current);
    const row: Ancestor | undefined = byId.get(current);
    if (!row) break;
    crumbs.unshift({ id: row.id, name: row.name });
    current = row.parent_id;
  }

  return [root, ...crumbs];
}

/** 노트를 옮길 곳을 고르는 창에 쓰는 전체 폴더 목록. 이름 앞에 경로를 붙여 준다. */
export async function listAllFolders(): Promise<{ id: string; label: string }[]> {
  const byId = await folderIndex();
  const rows = [...byId.values()];

  function label(row: Ancestor): string {
    const parts = [row.name];
    const seen = new Set([row.id]);
    let parent = row.parent_id;
    while (parent && byId.has(parent) && !seen.has(parent)) {
      seen.add(parent);
      const next = byId.get(parent)!;
      parts.unshift(next.name);
      parent = next.parent_id;
    }
    return parts.join(" / ");
  }

  return rows
    .map((row) => ({ id: row.id, label: label(row) }))
    .sort((a, b) => a.label.localeCompare(b.label));
}
