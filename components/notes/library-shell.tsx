import Link from "next/link";
import { GearIcon, NotePencilIcon, TrashIcon } from "@phosphor-icons/react/ssr";
import type { Crumb, FolderSummary } from "@/lib/notes/folders";
import type { ResolvedSort } from "@/lib/notes/sort";
import type { NoteSummary } from "@/lib/notes/types";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { FolderBar } from "@/components/notes/folder-bar";
import { FolderListItem } from "@/components/notes/folder-list-item";
import { FormatPicker } from "@/components/notes/format-picker";
import { NoteListItem } from "@/components/notes/note-list-item";
import { SortControls } from "@/components/notes/sort-controls";
import type { Locale } from "@/lib/i18n/locales";
import { format, type Messages } from "@/lib/i18n/messages";

/** 좁은 화면에서 앞에 세울 칸. 넓은 화면에서는 둘 다 보이므로 쓰이지 않는다. */
export type NarrowPane = "list" | "detail";

/**
 * 보관함과 노트 편집이 함께 쓰는 두 칸 레이아웃.
 * 좌측 패널은 어느 화면에서나 같고, 우측에 무엇을 놓을지는 각 페이지가 정한다.
 * 목록은 지금 열려 있는 폴더의 내용만 보여준다.
 *
 * 두 칸을 세울 수 없는 좁은 화면에서는 나란히 쌓지 않고 한 칸씩 쓴다.
 * 쌓으면 목록도 본문도 제 높이를 못 받아 둘 다 쓰기 어려워진다.
 * 본문 쪽 화면에는 목록으로 돌아가는 버튼이 머리말에 있다.
 */
export function LibraryShell({
  displayName,
  crumbs,
  folders,
  notes,
  sort,
  activeNoteId,
  narrow = "list",
  t,
  locale,
  children,
}: {
  displayName: string;
  t: Messages;
  locale: Locale;
  crumbs: Crumb[];
  folders: FolderSummary[];
  notes: NoteSummary[];
  sort: ResolvedSort;
  activeNoteId?: string;
  narrow?: NarrowPane;
  children: React.ReactNode;
}) {
  const here = crumbs[crumbs.length - 1].id;

  // 목록이 비어 있으면 좁은 화면에도 자리가 남는다. 그럴 때만 두 칸을 쌓아
  // 빈 보관함 안내까지 함께 보여준다.
  const listEmpty = folders.length === 0 && notes.length === 0;
  const stacked = narrow === "list" && listEmpty;

  return (
    <div className="flex h-svh flex-col bg-muted p-4 sm:p-6">
      <div
        className={cn(
          "mx-auto grid h-full w-full max-w-5xl grid-cols-1 overflow-hidden rounded-3xl bg-card shadow-md ring-1 ring-foreground/5 sm:grid-cols-[304px_1fr] sm:grid-rows-none",
          stacked ? "grid-rows-[auto_minmax(0,1fr)]" : "grid-rows-[minmax(0,1fr)]",
        )}
      >
        <aside
          className={cn(
            "flex min-h-0 flex-col bg-sidebar text-sidebar-foreground sm:flex sm:border-r sm:border-b-0 sm:border-sidebar-border",
            narrow === "detail" && "hidden",
            stacked && "border-b border-sidebar-border",
          )}
        >
          <div className="flex flex-col gap-2.5 border-b border-sidebar-border p-3">
            <div className="flex items-center gap-2 text-sm font-semibold">
              <NotePencilIcon className="size-4 text-sidebar-primary" />
              {t.app.name}
              <span className="ml-auto truncate text-xs font-medium text-muted-foreground">
                {displayName}
              </span>
            </div>
            <FolderBar crumbs={crumbs} />
            <SortControls sort={sort} />
          </div>

          {/* 목록이 길어져도 새 노트 카드는 이 칸 맨 위에 붙어 있는다.
              위쪽 여백은 카드가 직접 가진다. 칸에 두면 지나가는 항목이
              카드 위로 새어 나와 보인다. */}
          <div className="flex min-h-0 flex-1 flex-col gap-1.5 overflow-y-auto p-2.5 pt-0">
            <div className="sticky top-0 z-10 bg-sidebar pt-2.5 pb-1">
              <FormatPicker variant="card" folderId={here} />
            </div>

            {folders.length > 0 && (
              <p className="px-1 pt-1.5 text-[11px] font-semibold tracking-wide text-muted-foreground uppercase">
                {format(t.library.folders, { count: folders.length })}
              </p>
            )}
            {folders.map((folder) => (
              <FolderListItem key={folder.id} folder={folder} t={t} />
            ))}

            {notes.length > 0 && (
              <p className="px-1 pt-1.5 text-[11px] font-semibold tracking-wide text-muted-foreground uppercase">
                {format(t.library.notes, { count: notes.length })}
              </p>
            )}
            {notes.map((note) => (
              <NoteListItem
                key={note.id}
                note={note}
                active={note.id === activeNoteId}
                t={t}
                locale={locale}
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
              {t.trash.title}
            </Button>
            <Button
              variant="ghost"
              size="sm"
              className="flex-1 justify-start text-muted-foreground"
              render={<Link href="/settings" />}
              nativeButton={false}
            >
              <GearIcon data-icon="inline-start" />
              {t.settings.title}
            </Button>
          </div>
        </aside>

        <main
          className={cn(
            "flex min-h-0 min-w-0 flex-col sm:flex",
            narrow === "list" && !listEmpty && "hidden",
          )}
        >
          {children}
        </main>
      </div>
    </div>
  );
}
