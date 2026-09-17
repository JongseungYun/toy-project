import type { Metadata } from "next";
import { NotePencilIcon, PlusIcon } from "@phosphor-icons/react/ssr";
import { createClient } from "@/lib/supabase/server";
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

  const notes = await listNotes(sort);

  return (
    <LibraryShell
      displayName={profile?.username ?? user?.email ?? ""}
      notes={notes}
      sort={sort}
    >
      <div className="flex min-h-0 flex-1 items-center justify-center p-6">
        {notes.length === 0 ? (
          <Empty>
            <EmptyHeader>
              <EmptyMedia variant="icon">
                <PlusIcon />
              </EmptyMedia>
              <EmptyTitle>첫 노트를 만들어 보세요</EmptyTitle>
              <EmptyDescription>
                일반 문서, Markdown, 그림판 중에서 고를 수 있습니다. 쓰는 동안 저장은 알아서 됩니다.
              </EmptyDescription>
            </EmptyHeader>
            <EmptyContent>
              <FormatPicker variant="button" />
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
