import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { backgroundStyle, parseBackground } from "@/lib/notes/background";
import { signBackgroundUrl } from "@/lib/notes/background-actions";
import { displayTitle } from "@/lib/notes/display";
import { folderPath, listAllFolders, listFolders } from "@/lib/notes/folders";
import { getNote, listNotes } from "@/lib/notes/queries";
import { resolveSort } from "@/lib/notes/sort";
import { getMessages } from "@/lib/i18n/server";
import { CanvasEditor } from "@/components/notes/canvas-editor";
import { DocEditor } from "@/components/notes/doc-editor";
import { LibraryShell } from "@/components/notes/library-shell";
import { MarkdownEditor } from "@/components/notes/markdown-editor";
import { NoteActions } from "@/components/notes/note-actions";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ id: string }>;
}): Promise<Metadata> {
  const { t } = await getMessages();
  const note = await getNote((await params).id);
  return {
    title: note ? `${displayTitle(note, t)} — ${t.app.name}` : t.app.name,
  };
}

export default async function NotePage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ sort?: string; dir?: string }>;
}) {
  const { locale, t } = await getMessages();
  const { id } = await params;
  const sort = resolveSort(await searchParams);

  const note = await getNote(id);
  // 내 노트가 아니면 RLS가 걸러 여기까지 오지 않는다. 남의 노트, 없는 노트,
  // 휴지통에 있는 노트를 같은 결과로 돌려주어 존재 여부도 알리지 않는다.
  if (!note) notFound();

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

  // 좌측 목록은 이 노트가 담겨 있는 폴더의 내용을 보여준다.
  const folderId = note.folderId ?? null;
  const [crumbs, folders, notes, allFolders] = await Promise.all([
    folderPath(folderId, t.library.root),
    listFolders(folderId, sort),
    listNotes(sort, folderId),
    listAllFolders(),
  ]);

  // 배경 이미지는 비공개 버킷에 있으므로 여기서 서명된 주소를 받아 넘긴다.
  const background = parseBackground(note.background);
  const imageUrl =
    background.kind === "image" ? await signBackgroundUrl(background.path) : null;
  const surface = backgroundStyle(background, imageUrl);

  const actions = (
    <NoteActions
      noteId={note.id}
      folderId={folderId}
      folders={allFolders}
      background={background}
    />
  );

  return (
    <LibraryShell
      displayName={profile?.username ?? user?.email ?? ""}
      t={t}
      locale={locale}
      crumbs={crumbs}
      folders={folders}
      notes={notes}
      sort={sort}
      activeNoteId={note.id}
    >
      {note.format === "markdown" && (
        <MarkdownEditor note={note} actions={actions} surface={surface} />
      )}
      {note.format === "canvas" && (
        <CanvasEditor note={note} actions={actions} surface={surface} />
      )}
      {note.format === "doc" && (
        <DocEditor note={note} actions={actions} surface={surface} />
      )}
    </LibraryShell>
  );
}
