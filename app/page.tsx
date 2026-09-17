import type { Metadata } from "next";
import { FolderIcon, NotePencilIcon, PlusIcon } from "@phosphor-icons/react/ssr";
import { createClient } from "@/lib/supabase/server";
import { folderPath, listFolders } from "@/lib/notes/folders";
import { listNotes } from "@/lib/notes/queries";
import { resolveSort } from "@/lib/notes/sort";
import { FormatPicker } from "@/components/notes/format-picker";
import { LibraryShell } from "@/components/notes/library-shell";
import {
  Empty,
  EmptyContent,
  EmptyDescription,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
} from "@/components/ui/empty";

export const metadata: Metadata = {
  title: "내 보관함 — 아무노트",
};

export default async function LibraryPage({
  searchParams,
}: {
  searchParams: Promise<{ sort?: string; dir?: string; folder?: string }>;
}) {
  const params = await searchParams;
  const sort = resolveSort(params);
  const folderId = params.folder ?? null;

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

  const [crumbs, folders, notes] = await Promise.all([
    folderPath(folderId),
    listFolders(folderId, sort),
    listNotes(sort, folderId),
  ]);

  // 경로를 되짚지 못하면 사라졌거나 휴지통에 들어간 폴더다. 뿌리로 본다.
  const here = crumbs[crumbs.length - 1].id;
  const empty = folders.length === 0 && notes.length === 0;

  return (
    <LibraryShell
      displayName={profile?.username ?? user?.email ?? ""}
      crumbs={crumbs}
      folders={folders}
      notes={notes}
      sort={sort}
    >
      <div className="flex min-h-0 flex-1 items-center justify-center p-6">
        {empty ? (
          <Empty>
            <EmptyHeader>
              <EmptyMedia variant="icon">
                {here ? <FolderIcon /> : <PlusIcon />}
              </EmptyMedia>
              <EmptyTitle>
                {here ? "이 폴더는 비어 있습니다" : "첫 노트를 만들어 보세요"}
              </EmptyTitle>
              <EmptyDescription>
                일반 문서, Markdown, 그림판 중에서 고를 수 있습니다. 쓰는 동안 저장은 알아서 됩니다.
              </EmptyDescription>
            </EmptyHeader>
            <EmptyContent>
              <FormatPicker variant="button" folderId={here} />
            </EmptyContent>
          </Empty>
        ) : (
          <Empty>
            <EmptyHeader>
              <EmptyMedia variant="icon">
                <NotePencilIcon />
              </EmptyMedia>
              <EmptyTitle>왼쪽에서 노트를 고르세요</EmptyTitle>
              <EmptyDescription>
                고른 노트가 이 자리에 열립니다. 새로 쓰려면 왼쪽 위의 빈 카드를 누르세요.
              </EmptyDescription>
            </EmptyHeader>
          </Empty>
        )}
      </div>
    </LibraryShell>
  );
}
