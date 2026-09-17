import Link from "next/link";
import { GearIcon, NotePencilIcon, TrashIcon } from "@phosphor-icons/react/ssr";
import type { Crumb, FolderSummary } from "@/lib/notes/folders";
import type { ResolvedSort } from "@/lib/notes/sort";
import type { NoteSummary } from "@/lib/notes/types";
import { Button } from "@/components/ui/button";
import { FolderBar } from "@/components/notes/folder-bar";
import { FolderListItem } from "@/components/notes/folder-list-item";
import { FormatPicker } from "@/components/notes/format-picker";
import { NoteListItem } from "@/components/notes/note-list-item";
import { SortControls } from "@/components/notes/sort-controls";

/**
 * 보관함과 노트 편집이 함께 쓰는 두 칸 레이아웃.
 * 좌측 패널은 어느 화면에서나 같고, 우측에 무엇을 놓을지는 각 페이지가 정한다.
 * 목록은 지금 열려 있는 폴더의 내용만 보여준다.
 */
export function LibraryShell({
  displayName,
  crumbs,
  folders,
  notes,
  sort,
  activeNoteId,
  children,
}: {
  displayName: string;
  crumbs: Crumb[];
  folders: FolderSummary[];
  notes: NoteSummary[];
  sort: ResolvedSort;
  activeNoteId?: string;
  children: React.ReactNode;
}) {
  const here = crumbs[crumbs.length - 1].id;

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
            <FolderBar crumbs={crumbs} />
            <SortControls sort={sort} />
          </div>

          {/* 목록이 길어져도 새 노트 카드는 이 칸 맨 위에 붙어 있는다. */}
          <div className="flex min-h-0 flex-1 flex-col gap-1.5 overflow-y-auto p-2.5">
            <div className="sticky top-0 z-10 bg-sidebar pb-1">
              <FormatPicker variant="card" folderId={here} />
            </div>

            {folders.length > 0 && (
              <p className="px-1 pt-1.5 text-[11px] font-semibold tracking-wide text-muted-foreground uppercase">
                폴더 {folders.length}
              </p>
            )}
            {folders.map((folder) => (
              <FolderListItem key={folder.id} folder={folder} />
            ))}

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
              render={<Link href="/trash" />}
              nativeButton={false}
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
