import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { displayTitle } from "@/lib/notes/display";
import { getNote, listNotes } from "@/lib/notes/queries";
import { resolveSort } from "@/lib/notes/sort";
import { LibraryShell } from "@/components/notes/library-shell";
import { NoteEditor } from "@/components/notes/note-editor";

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
  // 내 노트가 아니면 RLS가 걸러 여기까지 오지 않는다. 남의 노트와 없는 노트를
  // 같은 결과로 돌려주어 존재 여부도 알리지 않는다.
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

  const notes = await listNotes(sort);

  return (
    <LibraryShell
      displayName={profile?.username ?? user?.email ?? ""}
      notes={notes}
      sort={sort}
      activeNoteId={note.id}
    >
      <NoteEditor note={note} />
    </LibraryShell>
  );
}
