import type { Metadata } from "next";
import Link from "next/link";
import { ArrowLeftIcon, TrashIcon } from "@phosphor-icons/react/ssr";
import { createClient } from "@/lib/supabase/server";
import { folderPath, listFolders } from "@/lib/notes/folders";
import { listNotes } from "@/lib/notes/queries";
import { resolveSort } from "@/lib/notes/sort";
import { listTrash } from "@/lib/notes/trash";
import { EmptyTrashButton } from "@/components/notes/empty-trash-button";
import { LibraryShell } from "@/components/notes/library-shell";
import { TrashRow } from "@/components/notes/trash-row";
import { Button } from "@/components/ui/button";
import {
  Empty,
  EmptyDescription,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
} from "@/components/ui/empty";

export const metadata: Metadata = {
  title: "휴지통 — 아무노트",
};

export default async function TrashPage({
  searchParams,
}: {
  searchParams: Promise<{ sort?: string; dir?: string }>;
}) {
  const sort = resolveSort(await searchParams);

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const profile = user
    ? (
        await supabase
          .from("profiles")
          .select("username")
          .eq("id", user.id)
          .maybeSingle()
      ).data
    : null;

  const [crumbs, folders, notes, entries] = await Promise.all([
    folderPath(null),
    listFolders(null, sort),
    listNotes(sort, null),
    listTrash(),
  ]);

  return (
    <LibraryShell
      displayName={profile?.username ?? user?.email ?? ""}
      crumbs={crumbs}
      folders={folders}
      notes={notes}
      sort={sort}
    >
      <div className="flex items-center gap-2 border-b border-border px-3 py-2">
        <Button
          variant="ghost"
          size="icon-sm"
          className="sm:hidden"
          render={<Link href="/" aria-label="목록으로" />}
          nativeButton={false}
        >
          <ArrowLeftIcon />
        </Button>
        <strong className="flex-1 pl-1 text-[15px]">휴지통</strong>
        {entries.length > 0 && <EmptyTrashButton count={entries.length} />}
      </div>

      {entries.length === 0 ? (
        <div className="flex min-h-0 flex-1 items-center justify-center p-6">
          <Empty>
            <EmptyHeader>
              <EmptyMedia variant="icon">
                <TrashIcon />
              </EmptyMedia>
              <EmptyTitle>휴지통이 비었습니다</EmptyTitle>
              <EmptyDescription>
                지운 노트와 폴더가 여기 모입니다. 되돌리기 전까지는 사라지지 않습니다.
              </EmptyDescription>
            </EmptyHeader>
          </Empty>
        </div>
      ) : (
        <div className="min-h-0 flex-1 overflow-y-auto p-5">
          <p className="mb-3.5 text-xs text-muted-foreground">
            되돌리면 원래 있던 폴더로 돌아갑니다.
          </p>
          <div className="flex flex-col gap-2">
            {entries.map((entry) => (
              <TrashRow key={`${entry.kind}-${entry.id}`} entry={entry} />
            ))}
          </div>
        </div>
      )}
    </LibraryShell>
  );
}
