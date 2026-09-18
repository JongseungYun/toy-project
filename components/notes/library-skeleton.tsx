import { cn } from "@/lib/utils";
import type { NarrowPane } from "@/components/notes/library-shell";
import { Skeleton } from "@/components/ui/skeleton";

/** 좌측 목록의 노트 한 줄 자리. NoteListItem과 같은 크기로 둔다. */
function RowSkeleton() {
  return (
    <div className="flex w-full items-center gap-2.5 p-1.5">
      <Skeleton className="size-14 flex-none rounded-md" />
      <div className="flex min-w-0 flex-1 flex-col gap-1.5">
        <Skeleton className="h-3 w-3/5 rounded-md" />
        <Skeleton className="h-2.5 w-2/5 rounded-md" />
      </div>
    </div>
  );
}

/**
 * 보관함과 노트 화면이 도착하기 전에 보여주는 뼈대.
 * LibraryShell과 같은 칸 구조를 써서 내용이 채워질 때 자리가 흔들리지 않는다.
 * 우측 칸에 무엇을 놓을지는 각 화면이 정한다.
 * 좁은 화면에서 어느 칸을 세울지도 LibraryShell과 같은 값을 받는다.
 */
export function LibrarySkeleton({
  narrow = "list",
  children,
}: {
  narrow?: NarrowPane;
  children?: React.ReactNode;
}) {
  return (
    <div aria-busy="true" className="flex h-svh flex-col bg-muted p-4 sm:p-6">
      <div className="mx-auto grid h-full w-full max-w-5xl grid-cols-1 grid-rows-[minmax(0,1fr)] overflow-hidden rounded-3xl bg-card shadow-md ring-1 ring-foreground/5 sm:grid-cols-[304px_1fr] sm:grid-rows-none">
        <aside
          className={cn(
            "flex min-h-0 flex-col bg-sidebar sm:flex sm:border-r sm:border-sidebar-border",
            narrow === "detail" && "hidden",
          )}
        >
          <div className="flex flex-col gap-2.5 border-b border-sidebar-border p-3">
            <Skeleton className="h-4 w-full rounded-md" />
            <Skeleton className="h-6 w-2/3 rounded-md" />
            <Skeleton className="h-7 w-full rounded-lg" />
          </div>

          <div className="flex min-h-0 flex-1 flex-col gap-1.5 overflow-hidden p-2.5">
            <Skeleton className="h-16 w-full rounded-xl" />
            <RowSkeleton />
            <RowSkeleton />
            <RowSkeleton />
          </div>

          <div className="flex gap-1 border-t border-sidebar-border p-2">
            <Skeleton className="h-8 flex-1 rounded-lg" />
            <Skeleton className="h-8 flex-1 rounded-lg" />
          </div>
        </aside>

        <main
          className={cn(
            "flex min-h-0 min-w-0 flex-col sm:flex",
            narrow === "list" && "hidden",
          )}
        >
          {children}
        </main>
      </div>
    </div>
  );
}

/** 노트 편집 칸의 자리. 머리말 한 줄과 본문 영역을 잡아 둔다. */
export function NoteSkeleton() {
  return (
    <>
      <div className="flex items-center gap-2 border-b border-border px-3 py-2">
        <Skeleton className="h-7 flex-1 rounded-md" />
        <Skeleton className="size-7 rounded-md" />
      </div>
      <div className="flex min-h-0 flex-1 flex-col gap-3 p-5">
        <Skeleton className="h-4 w-4/5 rounded-md" />
        <Skeleton className="h-4 w-3/5 rounded-md" />
        <Skeleton className="min-h-0 flex-1 rounded-xl" />
      </div>
    </>
  );
}
