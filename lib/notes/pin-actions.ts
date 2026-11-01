"use server";

import { revalidatePath } from "next/cache";
import { createClient, currentUser } from "@/lib/supabase/server";

/** 고정은 정리 정보다. 본문·제목과 편집 버전을 함께 쓰지 않는다. */
export async function setNotePinned(
  noteId: string,
  pinned: boolean,
): Promise<{ ok: boolean }> {
  if (typeof pinned !== "boolean") return { ok: false };
  try {
    const [user, supabase] = await Promise.all([currentUser(), createClient()]);
    if (!user) return { ok: false };
    const { data, error } = await supabase
      .from("notes")
      .update({ is_pinned: pinned })
      .eq("id", noteId)
      .eq("owner_id", user.id)
      .is("deleted_at", null)
      .select("id")
      .maybeSingle();
    if (error || !data) return { ok: false };
    revalidatePath("/", "layout");
    return { ok: true };
  } catch {
    return { ok: false };
  }
}
