// 노트의 형식과 저장 모양. 데이터베이스의 public.notes와 짝을 이룬다.

export const NOTE_FORMATS = ["doc", "markdown", "canvas"] as const;

export type NoteFormat = (typeof NOTE_FORMATS)[number];

export function isNoteFormat(value: unknown): value is NoteFormat {
  return NOTE_FORMATS.includes(value as NoteFormat);
}

// 형식마다 content의 모양이 다르다. 지금은 일반 문서만 쓰고,
// Markdown은 03이, 그림판은 04가 자기 모양을 더한다.
export interface DocContent {
  html: string;
}

export type NoteContent = DocContent | Record<string, unknown>;

export interface Note {
  id: string;
  format: NoteFormat;
  title: string;
  preview: string;
  content: NoteContent;
  version: number;
  createdAt: string;
  updatedAt: string;
}

// 목록에 필요한 만큼만 담는다. 본문 전체는 노트를 열 때 읽는다.
export type NoteSummary = Omit<Note, "content">;
