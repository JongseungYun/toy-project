"use client";

import Link from "next/link";
import { cn } from "@/lib/utils";
import { displayTitle, formatLabel, formatUpdatedAt } from "@/lib/notes/display";
import {
  CANVAS_HEIGHT,
  CANVAS_WIDTH,
  parseCanvasElements,
} from "@/lib/notes/canvas";
import {
  backgroundStyle,
  imageUrlOf,
  parseBackground,
} from "@/lib/notes/background";
import { NOTE_DRAG_TYPE } from "@/lib/notes/drag";
import type { NoteSummary } from "@/lib/notes/types";
import type { Messages } from "@/lib/i18n/messages";
import { CanvasShape } from "@/components/notes/canvas-figure";

/** 글로 쓰는 형식의 미리보기. 저장할 때 뽑아 둔 발췌를 작게 줄여 종이처럼 보인다. */
function TextThumb({ title, preview }: { title: string; preview: string }) {
  return (
    <span className="h-full w-full px-1.5 py-1 text-[4.5px] leading-[1.55] whitespace-pre-line text-muted-foreground">
      <b className="mb-0.5 block text-[6px] text-foreground">{title}</b>
      {preview}
    </span>
  );
}

/** 그림판의 미리보기. 같은 renderer로 같은 그림을 그림면 비율 그대로 줄여 그린다. */
function CanvasThumb({ preview }: { preview: string }) {
  const elements = parseCanvasElements(preview);

  return (
    <svg
      viewBox={`0 0 ${CANVAS_WIDTH} ${CANVAS_HEIGHT}`}
      className="h-full w-full"
      aria-hidden
    >
      {elements.map((element) => (
        <CanvasShape key={element.id} element={element} />
      ))}
    </svg>
  );
}

/**
 * 좌측 목록의 노트 한 줄. 제목, 형식, 마지막 수정 시점, 내용 미리보기를 함께 보여준다.
 *
 * 썸네일은 노트가 쓰고 있는 배경을 그대로 입는다. 배경을 바꾸면 여는 화면과
 * 목록이 같은 것을 보여주어야 어느 노트를 고르는지 눈으로 찾을 수 있다.
 *
 * 폴더로 끌어다 놓아 옮길 수 있다. 끌기를 쓸 수 없는 기기에서는 머리말의
 * 옮기기 창이 같은 일을 한다.
 */
export function NoteListItem({
  note,
  active,
  backgroundUrls,
  t,
  locale,
}: {
  note: NoteSummary;
  active: boolean;
  /** 이미지 배경의 서명된 주소. 경로를 열쇠로 한 화면이 한 번에 받아 둔 것이다. */
  backgroundUrls: Record<string, string>;
  t: Messages;
  locale: string;
}) {
  const title = displayTitle(note, t);
  const background = parseBackground(note.background);
  const surface = backgroundStyle(background, imageUrlOf(background, backgroundUrls));

  return (
    <Link
      href={`/notes/${note.id}`}
      data-testid="note-item"
      draggable
      onDragStart={(event) => {
        event.dataTransfer.setData(NOTE_DRAG_TYPE, note.id);
        event.dataTransfer.effectAllowed = "move";
      }}
      aria-current={active ? "page" : undefined}
      className={cn(
        "flex w-full items-center gap-2.5 rounded-xl border border-transparent p-1.5 text-left transition-colors hover:bg-sidebar-accent",
        active && "border-sidebar-border bg-sidebar-accent",
      )}
    >
      <span
        style={surface}
        data-testid="note-thumb"
        className="flex size-14 flex-none overflow-hidden rounded-md border border-sidebar-border bg-card"
      >
        {note.format === "canvas" ? (
          <CanvasThumb preview={note.preview} />
        ) : (
          <TextThumb title={title} preview={note.preview} />
        )}
      </span>
      <span className="min-w-0 flex-1">
        <span className="block truncate text-[13px] font-semibold">{title}</span>
        <span className="mt-0.5 flex items-center gap-1.5 text-[11px] text-muted-foreground">
          <span className="rounded-full border border-border bg-muted px-1.5 py-px text-[10px] whitespace-nowrap">
            {formatLabel(t, note.format)}
          </span>
          {formatUpdatedAt(note.updatedAt, {
            locale,
            yesterday: t.note.yesterday,
          })}
        </span>
      </span>
    </Link>
  );
}
