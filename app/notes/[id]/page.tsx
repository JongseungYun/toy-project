import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { displayName } from "@/lib/account/profile";
import {
  backgroundStyle,
  imagePathsOf,
  imageUrlOf,
  parseBackground,
} from "@/lib/notes/background";
import { signBackgroundUrls } from "@/lib/notes/background-actions";
import { displayTitle } from "@/lib/notes/display";
import { folderPath, listAllFolders, listFolders } from "@/lib/notes/folders";
import { getNote, listNotes, searchNotes } from "@/lib/notes/queries";
import { normalizeSearchText } from "@/lib/notes/search";
import { resolveSort } from "@/lib/notes/sort";
import { getMessages } from "@/lib/i18n/server";
import { CanvasEditor } from "@/components/notes/canvas-editor";
import { DocEditor } from "@/components/notes/doc-editor";
import { LibraryShell } from "@/components/notes/library-shell";
import { MarkdownEditor } from "@/components/notes/markdown-editor";
import { NoteActions } from "@/components/notes/note-actions";
import { ReadFailure } from "@/components/notes/read-failure";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ id: string }>;
}): Promise<Metadata> {
  const { t } = await getMessages();
  const result = await getNote((await params).id);
  const note = result.ok ? result.data : null;
  return {
    title: note ? `${displayTitle(note, t)} — ${t.app.name}` : t.app.name,
  };
}

export default async function NotePage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ sort?: string; dir?: string; q?: string | string[] }>;
}) {
  const { locale, t } = await getMessages();
  const { id } = await params;
  const queryParams = await searchParams;
  const sort = resolveSort(queryParams);
  const query = normalizeSearchText(
    typeof queryParams.q === "string" ? queryParams.q : "",
  );

  const result = await getNote(id);
  if (!result.ok) return <ReadFailure />;
  const note = result.data;
  // 내 노트가 아니면 RLS가 걸러 여기까지 오지 않는다. 남의 노트, 없는 노트,
  // 휴지통에 있는 노트를 같은 결과로 돌려주어 존재 여부도 알리지 않는다.
  if (!note) notFound();

  // 검색에서 열었으면 결과를 유지하고, 기본 목록은 이 노트의 폴더를 보여준다.
  const folderId = note.folderId ?? null;
  const background = parseBackground(note.background);

  // 서로 기다릴 이유가 없는 조회들이다. 한꺼번에 보내고 함께 받는다.
  const [
    name,
    pathResult,
    foldersResult,
    notesResult,
    allFoldersResult,
    searchResult,
  ] = await Promise.all([
    displayName(),
    folderPath(folderId, t.library.root),
    query
      ? Promise.resolve({ ok: true as const, data: [] })
      : listFolders(folderId, sort),
    query
      ? Promise.resolve({ ok: true as const, data: [] })
      : listNotes(sort, folderId),
    listAllFolders(),
    query
      ? searchNotes(query)
      : Promise.resolve({ ok: true as const, data: [] }),
  ]);
  if (
    !pathResult.ok ||
    !foldersResult.ok ||
    !notesResult.ok ||
    !allFoldersResult.ok
  ) {
    return <ReadFailure />;
  }
  const crumbs = pathResult.data;
  const folders = foldersResult.data;
  const notes = notesResult.data;
  const allFolders = allFoldersResult.data;

  // 배경 이미지는 비공개 버킷에 있어 서명된 주소가 필요하다. 여는 노트와
  // 좌측 목록의 썸네일이 쓰는 것을 한 번에 받는다.
  const backgroundUrls = await signBackgroundUrls(
    imagePathsOf([...notes, { background: note.background }]),
  );

  const surface = backgroundStyle(
    background,
    imageUrlOf(background, backgroundUrls),
  );

  const actions = (
    <NoteActions
      noteId={note.id}
      folderId={folderId}
      folders={allFolders}
      background={background}
      shareToken={note.shareToken ?? null}
    />
  );

  return (
    <LibraryShell
      displayName={name}
      t={t}
      locale={locale}
      crumbs={crumbs}
      folders={folders}
      notes={notes}
      sort={sort}
      backgroundUrls={backgroundUrls}
      activeNoteId={note.id}
      narrow="detail"
      search={
        query
          ? {
              query,
              results: searchResult.ok ? searchResult.data : [],
              failed: !searchResult.ok,
              folders: allFolders,
            }
          : undefined
      }
    >
      {note.format === "markdown" && (
        <MarkdownEditor
          key={note.id}
          note={note}
          actions={actions}
          surface={surface}
        />
      )}
      {note.format === "canvas" && (
        <CanvasEditor
          key={note.id}
          note={note}
          actions={actions}
          surface={surface}
        />
      )}
      {note.format === "doc" && (
        <DocEditor
          key={note.id}
          note={note}
          actions={actions}
          surface={surface}
        />
      )}
    </LibraryShell>
  );
}
