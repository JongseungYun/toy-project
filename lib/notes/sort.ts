// 보관함 목록의 정렬 기준. 고른 값은 주소에 담기므로 새로고침해도 유지된다.

export const SORT_OPTIONS = [
  {
    value: "updated",
    label: "수정일 최신순",
    column: "updated_at",
    defaultAscending: false,
  },
  {
    value: "created",
    label: "생성일 최신순",
    column: "created_at",
    defaultAscending: false,
  },
  // 제목만 오름차순이 기본이다. 화면 문구가 "가나다순"이라고 약속하기 때문이다.
  { value: "title", label: "제목 가나다순", column: "title", defaultAscending: true },
] as const;

export type SortKey = (typeof SORT_OPTIONS)[number]["value"];

export interface ResolvedSort {
  key: SortKey;
  ascending: boolean;
}

const DEFAULT_KEY: SortKey = "updated";

function option(key: SortKey) {
  return SORT_OPTIONS.find((candidate) => candidate.value === key)!;
}

export function resolveSort(params: {
  sort?: string | string[];
  dir?: string | string[];
}): ResolvedSort {
  const sort = Array.isArray(params.sort) ? params.sort[0] : params.sort;
  const dir = Array.isArray(params.dir) ? params.dir[0] : params.dir;

  const chosen = SORT_OPTIONS.find((candidate) => candidate.value === sort);
  const key = chosen ? chosen.value : DEFAULT_KEY;

  // 방향을 따로 고르지 않았으면 그 기준에 자연스러운 쪽으로 시작한다.
  const ascending =
    dir === "asc" ? true : dir === "desc" ? false : option(key).defaultAscending;

  return { key, ascending };
}

export function sortColumn(key: SortKey): string {
  return option(key).column;
}

export function toggleDirection(ascending: boolean): "asc" | "desc" {
  return ascending ? "desc" : "asc";
}
