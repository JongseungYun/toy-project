import Link from "next/link";
import { cn } from "@/lib/utils";
import { FORMAT_LABEL, displayTitle, formatUpdatedAt } from "@/lib/notes/display";
import {
  CANVAS_HEIGHT,
  CANVAS_WIDTH,
  parseCanvasElements,
} from "@/lib/notes/canvas";
import type { NoteSummary } from "@/lib/notes/types";
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
 */
export function NoteListItem({
  note,
  active,
}: {
  note: NoteSummary;
  active: boolean;
}) {
  const title = displayTitle(note);

  return (
    <Link
      href={`/notes/${note.id}`}
      data-testid="note-item"
      aria-current={active ? "page" : undefined}
      className={cn(
        "flex w-full items-center gap-2.5 rounded-xl border border-transparent p-1.5 text-left transition-colors hover:bg-sidebar-accent",
        active && "border-sidebar-border bg-sidebar-accent",
      )}
    >
      <span className="flex size-14 flex-none overflow-hidden rounded-md border border-sidebar-border bg-card">
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
            {FORMAT_LABEL[note.format]}
          </span>
          {formatUpdatedAt(note.updatedAt)}
        </span>
      </span>
    </Link>
  );
}
