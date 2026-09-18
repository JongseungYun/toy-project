"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createClient, currentUser } from "@/lib/supabase/server";
import { getMessages } from "@/lib/i18n/server";

type Supabase = Awaited<ReturnType<typeof createClient>>;

async function ownerId() {
  const [user, supabase] = await Promise.all([currentUser(), createClient()]);
  if (!user) redirect("/login");
  return { supabase, userId: user.id };
}

/** 폴더를 만든다. parentId가 있으면 그 폴더 안에 만든다. 깊이 제한은 없다. */
export async function createFolder(name: string, parentId: string | null) {
  const { supabase, userId } = await ownerId();
  const { t } = await getMessages();
  const trimmed = name.trim() || t.folder.newFolder;

  const { error } = await supabase
    .from("folders")
    .insert({ owner_id: userId, parent_id: parentId, name: trimmed });

  if (error) throw new Error("폴더를 만들지 못했습니다.");
  revalidatePath("/", "layout");
}

/** 노트를 다른 폴더로 옮긴다. folderId가 null이면 보관함 뿌리로 옮긴다. */
export async function moveNote(noteId: string, folderId: string | null) {
  const { supabase } = await ownerId();

  const { error } = await supabase
    .from("notes")
    .update({ folder_id: folderId })
    .eq("id", noteId);

  if (error) throw new Error("노트를 옮기지 못했습니다.");
  revalidatePath("/", "layout");
}

/** 노트를 휴지통으로 보낸다. 되돌리기 전까지 사라지지 않는다. */
export async function trashNote(noteId: string) {
  const { supabase } = await ownerId();

  const { error } = await supabase
    .from("notes")
    .update({ deleted_at: new Date().toISOString(), trash_root_id: noteId })
    .eq("id", noteId);

  if (error) throw new Error("노트를 휴지통으로 보내지 못했습니다.");
  redirect("/");
}

/** 폴더를 휴지통으로 보낸다. 그 안의 하위 폴더와 노트도 함께 간다. */
export async function trashFolder(folderId: string, parentId: string | null) {
  const { supabase } = await ownerId();

  const { error } = await supabase.rpc("trash_folder", { target: folderId });
  if (error) throw new Error("폴더를 휴지통으로 보내지 못했습니다.");

  // 지운 폴더 안에 있었으므로 상위로 올라간다.
  redirect(parentId ? `/?folder=${parentId}` : "/");
}

/** 담겨 있던 폴더가 아직 휴지통에 있는지 본다. 이미 사라진 폴더도 같게 본다. */
async function placeIsGone(supabase: Supabase, folderId: string | null) {
  if (!folderId) return false;

  const { data } = await supabase
    .from("folders")
    .select("deleted_at")
    .eq("id", folderId)
    .maybeSingle();

  return !data || data.deleted_at !== null;
}

/**
 * 사용자가 직접 지운 항목 하나가 돌아갈 자리를 확인한다. 자리가 아직 휴지통에
 * 있으면 보관함 뿌리로 올린다. 함께 딸려 들어온 것들은 자기 부모와 한 묶음으로
 * 돌아오므로 건드리지 않는다.
 */
async function liftIfPlaceIsGone(supabase: Supabase, rootId: string) {
  const { data: folder } = await supabase
    .from("folders")
    .select("parent_id")
    .eq("id", rootId)
    .maybeSingle();

  if (folder) {
    if (await placeIsGone(supabase, folder.parent_id)) {
      await supabase.from("folders").update({ parent_id: null }).eq("id", rootId);
    }
    return;
  }

  const { data: note } = await supabase
    .from("notes")
    .select("folder_id")
    .eq("id", rootId)
    .maybeSingle();

  if (note && (await placeIsGone(supabase, note.folder_id))) {
    await supabase.from("notes").update({ folder_id: null }).eq("id", rootId);
  }
}

/**
 * 휴지통에서 되돌린다. 함께 들어온 것들도 같이 원래 자리로 돌아간다.
 *
 * 돌아갈 자리가 아직 휴지통에 있으면 보관함 뿌리로 올린다. 그러지 않으면 되돌린
 * 것이 보관함에도 휴지통에도 보이지 않고, 나중에 그 자리를 영구 삭제할 때
 * on delete cascade로 함께 사라진다.
 * docs/decisions/note-safety.md 참고.
 */
export async function restoreTrashed(rootId: string) {
  const { supabase } = await ownerId();

  const restore = { deleted_at: null, trash_root_id: null };
  const [folders, notes] = await Promise.all([
    supabase.from("folders").update(restore).eq("trash_root_id", rootId),
    supabase.from("notes").update(restore).eq("trash_root_id", rootId),
  ]);

  if (folders.error || notes.error) {
    throw new Error("되돌리지 못했습니다.");
  }

  await liftIfPlaceIsGone(supabase, rootId);
  revalidatePath("/", "layout");
}

/** 영구 삭제. 돌이킬 수 없다. 화면에서 확인을 받은 뒤에만 부른다. */
export async function purgeTrashed(rootId: string) {
  const { supabase } = await ownerId();

  // 폴더를 먼저 지우면 그 안의 노트가 on delete cascade로 함께 사라진다.
  const folders = await supabase.from("folders").delete().eq("trash_root_id", rootId);
  const notes = await supabase.from("notes").delete().eq("trash_root_id", rootId);

  if (folders.error || notes.error) {
    throw new Error("영구 삭제하지 못했습니다.");
  }
  revalidatePath("/", "layout");
}

/** 휴지통을 통째로 비운다. 돌이킬 수 없다. */
export async function emptyTrash() {
  const { supabase, userId } = await ownerId();

  const folders = await supabase
    .from("folders")
    .delete()
    .eq("owner_id", userId)
    .not("deleted_at", "is", null);
  const notes = await supabase
    .from("notes")
    .delete()
    .eq("owner_id", userId)
    .not("deleted_at", "is", null);

  if (folders.error || notes.error) {
    throw new Error("휴지통을 비우지 못했습니다.");
  }
  revalidatePath("/", "layout");
}
