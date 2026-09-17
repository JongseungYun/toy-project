import { firstTextOf, parseCanvasElements } from "@/lib/notes/canvas";
import type { Messages } from "@/lib/i18n/messages";
import type { NoteFormat } from "@/lib/notes/types";

/** 형식의 이름. 목록의 배지와 휴지통이 같은 말을 쓴다. */
export function formatLabel(t: Messages, format: NoteFormat): string {
  return t.format[format === "doc" ? "doc" : format];
}

/** 제목도 본문도 비었을 때 쓰는 이름. */
export function untitledTitle(t: Messages, format: NoteFormat): string {
  if (format === "markdown") return t.format.untitledMarkdown;
  if (format === "canvas") return t.format.untitledCanvas;
  return t.format.untitledDoc;
}

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
 * 노트 내용은 번역하지 않는다. 기본 이름만 표시 언어를 따른다.
 */
export function displayTitle(
  note: { title: string; preview: string; format: NoteFormat },
  t: Messages,
): string {
  const typed = note.title.trim();
  if (typed) return typed;

  // 그림판의 미리보기는 글이 아니라 그림 요소다. 그림에 적힌 글만 제목이 된다.
  const fromBody =
    note.format === "canvas"
      ? firstTextOf(parseCanvasElements(note.preview)).slice(0, TITLE_LIMIT)
      : firstLine(note.preview, note.format);
  if (fromBody) return fromBody;

  return untitledTitle(t, note.format);
}

export interface TimeOptions {
  /** 날짜와 시각을 어느 언어로 적을지. */
  locale?: string;
  /** "어제"에 해당하는 문구. 언어마다 다르므로 밖에서 받는다. */
  yesterday?: string;
  now?: Date;
  timeZone?: string;
}

function dayIndex(date: Date, timeZone: string | undefined): number {
  // 같은 날인지 비교하려고 그 지역의 날짜 문자열을 쓴다.
  const key = new Intl.DateTimeFormat("en-CA", {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    timeZone,
  }).format(date);
  return Date.parse(`${key}T00:00:00Z`) / 86_400_000;
}

/** 마지막 수정 시점을 읽기 쉬운 짧은 말로 바꾼다. */
export function formatUpdatedAt(iso: string, options: TimeOptions = {}): string {
  const { locale = "en", yesterday = "Yesterday", now = new Date(), timeZone } =
    options;

  const at = new Date(iso);
  const gap = dayIndex(now, timeZone) - dayIndex(at, timeZone);

  if (gap <= 0) {
    return new Intl.DateTimeFormat(locale, {
      hour: "numeric",
      minute: "2-digit",
      timeZone,
    }).format(at);
  }

  if (gap === 1) return yesterday;

  return new Intl.DateTimeFormat(locale, {
    month: "long",
    day: "numeric",
    timeZone,
  }).format(at);
}
