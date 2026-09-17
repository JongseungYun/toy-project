import Link from "next/link";
import { GearIcon, NotePencilIcon, TrashIcon } from "@phosphor-icons/react/ssr";
import type { ResolvedSort } from "@/lib/notes/sort";
import type { NoteSummary } from "@/lib/notes/types";
import { Button } from "@/components/ui/button";
import { FormatPicker } from "@/components/notes/format-picker";
import { NoteListItem } from "@/components/notes/note-list-item";
import { SortControls } from "@/components/notes/sort-controls";

/**
 * 보관함과 노트 편집이 함께 쓰는 두 칸 레이아웃.
 * 좌측 패널은 어느 화면에서나 같고, 우측에 무엇을 놓을지는 각 페이지가 정한다.
 */
export function LibraryShell({
  displayName,
  notes,
  sort,
  activeNoteId,
  children,
}: {
  displayName: string;
  notes: NoteSummary[];
  sort: ResolvedSort;
  activeNoteId?: string;
  children: React.ReactNode;
}) {
  return (
    <div className="flex h-svh flex-col bg-muted p-4 sm:p-6">
      <div className="mx-auto grid h-full w-full max-w-5xl grid-cols-1 overflow-hidden rounded-3xl bg-card shadow-md ring-1 ring-foreground/5 sm:grid-cols-[304px_1fr]">
        <aside className="flex min-h-0 flex-col border-b border-sidebar-border bg-sidebar text-sidebar-foreground sm:border-r sm:border-b-0">
          <div className="flex flex-col gap-2.5 border-b border-sidebar-border p-3">
            <div className="flex items-center gap-2 text-sm font-semibold">
              <NotePencilIcon className="size-4 text-sidebar-primary" />
              아무노트
              <span className="ml-auto truncate text-xs font-medium text-muted-foreground">
                {displayName}
              </span>
            </div>
            {/* 폴더는 태스크 05가 가져간다. 지금 경로는 뿌리 한 칸뿐이다. */}
            <nav aria-label="폴더 경로" className="flex items-center gap-0.5 text-xs">
              <span className="px-1.5 py-0.5 font-semibold">내 노트</span>
            </nav>
            <SortControls sort={sort} />
          </div>

          {/* 목록이 길어져도 새 노트 카드는 이 칸 맨 위에 붙어 있는다. */}
          <div className="flex min-h-0 flex-1 flex-col gap-1.5 overflow-y-auto p-2.5">
            <div className="sticky top-0 z-10 bg-sidebar pb-1">
              <FormatPicker variant="card" />
            </div>

            {notes.length > 0 && (
              <p className="px-1 pt-1.5 text-[11px] font-semibold tracking-wide text-muted-foreground uppercase">
                노트 {notes.length}
              </p>
            )}
            {notes.map((note) => (
              <NoteListItem
                key={note.id}
                note={note}
                active={note.id === activeNoteId}
              />
            ))}
          </div>

          <div className="flex gap-1 border-t border-sidebar-border p-2">
            <Button
              variant="ghost"
              size="sm"
              className="flex-1 justify-start text-muted-foreground"
              disabled
            >
              <TrashIcon data-icon="inline-start" />
              휴지통
            </Button>
            <Button
              variant="ghost"
              size="sm"
              className="flex-1 justify-start text-muted-foreground"
              render={<Link href="/settings" />}
              nativeButton={false}
            >
              <GearIcon data-icon="inline-start" />
              설정
            </Button>
          </div>
        </aside>

        <main className="flex min-h-0 min-w-0 flex-col">{children}</main>
      </div>
    </div>
  );
}
