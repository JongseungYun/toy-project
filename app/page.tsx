import type { Metadata } from "next";
import { FolderIcon, NotePencilIcon, PlusIcon } from "@phosphor-icons/react/ssr";
import { displayName } from "@/lib/account/profile";
import { folderPath, listFolders } from "@/lib/notes/folders";
import { listNotes } from "@/lib/notes/queries";
import { resolveSort } from "@/lib/notes/sort";
import { getMessages } from "@/lib/i18n/server";
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

export async function generateMetadata(): Promise<Metadata> {
  const { t } = await getMessages();
  return { title: `${t.library.title} — ${t.app.name}` };
}

export default async function LibraryPage({
  searchParams,
}: {
  searchParams: Promise<{ sort?: string; dir?: string; folder?: string }>;
}) {
  const { locale, t } = await getMessages();
  const params = await searchParams;
  const sort = resolveSort(params);
  const folderId = params.folder ?? null;

  // 서로 기다릴 이유가 없는 조회들이다. 한꺼번에 보내고 함께 받는다.
  const [name, crumbs, folders, notes] = await Promise.all([
    displayName(),
    folderPath(folderId, t.library.root),
    listFolders(folderId, sort),
    listNotes(sort, folderId),
  ]);

  // 경로를 되짚지 못하면 사라졌거나 휴지통에 들어간 폴더다. 뿌리로 본다.
  const here = crumbs[crumbs.length - 1].id;
  const empty = folders.length === 0 && notes.length === 0;

  return (
    <LibraryShell
      displayName={name}
      t={t}
      locale={locale}
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
                {here ? t.library.emptyFolderTitle : t.library.emptyTitle}
              </EmptyTitle>
              <EmptyDescription>
                {t.library.emptyBody}
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
              <EmptyTitle>{t.library.pickTitle}</EmptyTitle>
              <EmptyDescription>
                {t.library.pickBody}
              </EmptyDescription>
            </EmptyHeader>
          </Empty>
        )}
      </div>
    </LibraryShell>
  );
}
