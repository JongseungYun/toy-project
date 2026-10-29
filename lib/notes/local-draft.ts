import { isNoteFormat, type NoteContent, type NoteFormat } from "@/lib/notes/types";

/** 서버에 반영되기 전의 편집본. baseVersion으로 기존 충돌 검사를 이어간다. */
export interface LocalNoteDraft {
  id: string;
  format: NoteFormat;
  title: string;
  content: NoteContent;
  preview: string;
  baseVersion: number;
}

export function localDraftKey(ownerId: string, noteId: string): string {
  return `amu-note:draft:${ownerId}:${noteId}`;
}

export function readLocalDraft(key: string | null): LocalNoteDraft | null {
  if (!key) return null;
  try {
    const raw = localStorage.getItem(key);
    if (!raw) return null;
    const draft = JSON.parse(raw);
    if (!draft || typeof draft.id !== "string" || !isNoteFormat(draft.format)
      || typeof draft.title !== "string" || typeof draft.preview !== "string"
      || !draft.content || typeof draft.content !== "object" || Array.isArray(draft.content)
      || !Number.isInteger(draft.baseVersion) || draft.baseVersion < 0) return null;
    return draft;
  } catch {
    return null;
  }
}

export function writeLocalDraft(key: string | null, draft: LocalNoteDraft): boolean {
  if (!key) return false;
  try {
    localStorage.setItem(key, JSON.stringify(draft));
    return true;
  } catch {
    return false;
  }
}

/** 늦게 도착한 저장 응답이 새 입력이나 다른 탭의 초안을 지우지 않게 한다. */
export function clearLocalDraft(key: string | null, expectedId: string | null): void {
  if (!key || !expectedId) return;
  try {
    if (readLocalDraft(key)?.id === expectedId) localStorage.removeItem(key);
  } catch {
    // 저장 자체는 완료됐다. 다음에 서버와 같은 초안을 읽으면 다시 정리한다.
  }
}

/** jsonb에서 키 순서가 바뀌어도 이미 저장된 내용은 같은 편집본으로 읽는다. */
export function sameDraftContent(
  left: { title: string; content: NoteContent },
  right: { title: string; content: NoteContent },
): boolean {
  const stable = (value: unknown) => JSON.stringify(value, (_key, part) =>
    part && typeof part === "object" && !Array.isArray(part)
      ? Object.fromEntries(Object.keys(part).sort().map((key) => [key, part[key]]))
      : part);
  return left.title === right.title && stable(left.content) === stable(right.content);
}
