import Link from "next/link";
import { cn } from "@/lib/utils";
import { FORMAT_LABEL, displayTitle, formatUpdatedAt } from "@/lib/notes/display";
import type { NoteSummary } from "@/lib/notes/types";

/**
 * 좌측 목록의 노트 한 줄. 제목, 형식, 마지막 수정 시점, 내용 미리보기를 함께 보여준다.
 * 미리보기는 저장할 때 뽑아 둔 발췌를 작게 줄여 종이처럼 보이게 한 것이다.
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
        <span className="h-full w-full px-1.5 py-1 text-[4.5px] leading-[1.55] text-muted-foreground">
          <b className="mb-0.5 block text-[6px] text-foreground">{title}</b>
          {note.preview}
        </span>
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
