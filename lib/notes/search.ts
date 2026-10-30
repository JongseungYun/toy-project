import type { NoteFormat } from "./types";

export interface NoteSearchResult {
  id: string;
  format: NoteFormat;
  title: string;
  folderId: string | null;
  excerpt: string;
  updatedAt: string;
}

/** 줄·문단 경계는 한 칸으로 찾되 글자 서식 경계는 그대로 연결한다. */
export function normalizeSearchText(value: string): string {
  return value.normalize("NFC").replace(/\s+/gu, " ").trim();
}

export function searchHref(query: string): string {
  return `/search?${new URLSearchParams({ q: query })}`;
}

/** 검색어는 정규식이 아닌 문자 그대로이며, 원문 위치를 강조에도 재사용한다. */
export function matchRanges(
  text: string,
  query: string,
): { start: number; end: number }[] {
  const phrase = normalizeSearchText(query);
  if (!phrase) return [];
  const literal = phrase.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  return [...text.matchAll(new RegExp(literal, "giu"))].map((match) => ({
    start: match.index,
    end: match.index + match[0].length,
  }));
}

export function searchExcerpt(text: string, query: string): string {
  const first = matchRanges(text, query)[0];
  const start = Math.max(0, (first?.start ?? 0) - 16);
  const end = Math.min(text.length, Math.max(start + 150, first?.end ?? 0));
  return `${start > 0 ? "…" : ""}${text.slice(start, end)}${end < text.length ? "…" : ""}`;
}
