import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { displayTitle } from "@/lib/notes/display";
import { folderPath, listAllFolders, listFolders } from "@/lib/notes/folders";
import { getNote, listNotes } from "@/lib/notes/queries";
import { resolveSort } from "@/lib/notes/sort";
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
  const note = await getNote((await params).id);
  return { title: note ? `${displayTitle(note)} — 아무노트` : "아무노트" };
}

export default async function NotePage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ sort?: string; dir?: string }>;
}) {
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
    folderPath(folderId),
    listFolders(folderId, sort),
    listNotes(sort, folderId),
    listAllFolders(),
  ]);

  const actions = (
    <NoteActions noteId={note.id} folderId={folderId} folders={allFolders} />
  );

  return (
    <LibraryShell
      displayName={profile?.username ?? user?.email ?? ""}
      crumbs={crumbs}
      folders={folders}
      notes={notes}
      sort={sort}
      activeNoteId={note.id}
    >
      {note.format === "markdown" && <MarkdownEditor note={note} actions={actions} />}
      {note.format === "canvas" && <CanvasEditor note={note} actions={actions} />}
      {note.format === "doc" && <DocEditor note={note} actions={actions} />}
    </LibraryShell>
  );
}
