import { firstTextOf, parseCanvasElements } from "@/lib/notes/canvas";
import type { NoteFormat } from "@/lib/notes/types";

// 용어집(GLOSSARY.md)이 정한 형식 이름. 화면 문구와 코드가 같은 말을 쓴다.
export const FORMAT_LABEL: Record<NoteFormat, string> = {
  doc: "일반 문서",
  markdown: "Markdown",
  canvas: "그림판",
};

// 제목도 본문도 비었을 때 목록에 쓰는 이름.
export const DEFAULT_TITLE: Record<NoteFormat, string> = {
  doc: "제목 없는 일반 문서",
  markdown: "제목 없는 Markdown 문서",
  canvas: "제목 없는 그림판",
};

const PREVIEW_LIMIT = 200;
const TITLE_LIMIT = 60;

const ENTITIES: Record<string, string> = {
  "&nbsp;": " ",
  "&amp;": "&",
  "&lt;": "<",
  "&gt;": ">",
  "&quot;": '"',
  "&#39;": "'",
};

/** 줄 구조는 살리고 군더더기 공백만 줄인다. 목록 미리보기가 문단처럼 보인다. */
function tidy(text: string): string {
  return text
    .replace(/\r\n?/g, "\n")
    .replace(/[^\S\n]+/g, " ")
    .replace(/ *\n */g, "\n")
    .replace(/\n{3,}/g, "\n\n")
    .trim()
    .slice(0, PREVIEW_LIMIT);
}

/**
 * 일반 문서의 본문 HTML에서 목록 미리보기에 쓸 글만 뽑는다.
 * 저장할 때 한 번 계산해 두므로 목록은 본문을 다시 훑지 않는다.
 */
export function previewFromHtml(html: string): string {
  const text = html
    // 블록이 끝나는 자리는 줄바꿈으로 바꿔야 문단이 서로 붙지 않는다.
    .replace(/<(br|\/p|\/div|\/li|\/h[1-6]|\/tr)[^>]*>/gi, "\n")
    .replace(/<[^>]*>/g, "")
    .replace(/&[a-z]+;|&#\d+;/gi, (entity) => ENTITIES[entity.toLowerCase()] ?? " ");

  return tidy(text);
}

/**
 * Markdown 노트의 미리보기는 원문 그대로다. 목록의 작은 썸네일에서
 * `#`와 `-` 같은 기호가 보이는 편이 어떤 형식인지 알아보기 쉽다.
 */
export function previewFromMarkdown(source: string): string {
  return tidy(source);
}

// Markdown 첫 줄에 붙는 기호. 제목 자리에는 글만 남긴다.
const MARKDOWN_MARKERS = /^\s*(#{1,6}\s+|[-*+]\s+|\d+\.\s+|>\s*)+/;

function firstLine(preview: string, format: NoteFormat): string {
  const line = preview.split("\n").find((candidate) => candidate.trim()) ?? "";
  const stripped = format === "markdown" ? line.replace(MARKDOWN_MARKERS, "") : line;
  return stripped.trim().slice(0, TITLE_LIMIT);
}

/**
 * 목록과 탭에 보여줄 이름. 사용자가 적은 제목이 먼저고,
 * 비어 있으면 본문 첫 줄, 그것도 없으면 형식에 맞는 기본 이름을 쓴다.
 */
export function displayTitle(note: {
  title: string;
  preview: string;
  format: NoteFormat;
}): string {
  const typed = note.title.trim();
  if (typed) return typed;

  // 그림판의 미리보기는 글이 아니라 그림 요소다. 그림에 적힌 글만 제목이 된다.
  const fromBody =
    note.format === "canvas"
      ? firstTextOf(parseCanvasElements(note.preview)).slice(0, TITLE_LIMIT)
      : firstLine(note.preview, note.format);
  if (fromBody) return fromBody;

  return DEFAULT_TITLE[note.format];
}

const TIME_FORMAT = new Intl.DateTimeFormat("ko-KR", {
  hour: "numeric",
  minute: "2-digit",
  timeZone: "Asia/Seoul",
});

const DATE_FORMAT = new Intl.DateTimeFormat("ko-KR", {
  month: "long",
  day: "numeric",
  timeZone: "Asia/Seoul",
});

function dayIndex(date: Date): number {
  // 한국 시간 기준으로 며칠째인지. 시각을 버리고 날짜만 비교한다.
  return Math.floor((date.getTime() + 9 * 60 * 60 * 1000) / 86_400_000);
}

/** 마지막 수정 시점을 목록과 머리말에서 읽기 쉬운 짧은 말로 바꾼다. */
export function formatUpdatedAt(iso: string, now: Date = new Date()): string {
  const at = new Date(iso);
  const gap = dayIndex(now) - dayIndex(at);

  if (gap <= 0) return TIME_FORMAT.format(at);
  if (gap === 1) return "어제";
  return DATE_FORMAT.format(at);
}
