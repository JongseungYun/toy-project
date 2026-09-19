"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createClient, currentUser } from "@/lib/supabase/server";

async function session() {
  const [user, supabase] = await Promise.all([currentUser(), createClient()]);
  if (!user) redirect("/login");
  return { supabase, userId: user.id };
}

/**
 * 이 노트의 읽기 전용 링크를 연다. 열쇠는 노트마다 새로 만든다.
 *
 * 이미 공유 중이면 쓰던 열쇠를 그대로 돌려준다. 열 때마다 열쇠가 바뀌면
 * 이미 나눠 준 링크가 조용히 끊긴다.
 */
export async function startSharing(noteId: string): Promise<string> {
  const { supabase, userId } = await session();

  const { data: current } = await supabase
    .from("notes")
    .select("share_token")
    .eq("id", noteId)
    .eq("owner_id", userId)
    .maybeSingle<{ share_token: string | null }>();

  if (current?.share_token) return current.share_token;

  const token = crypto.randomUUID();
  const { data, error } = await supabase
    .from("notes")
    .update({ share_token: token, shared_at: new Date().toISOString() })
    .eq("id", noteId)
    // 소유자 조건은 RLS가 이미 건다. 여기 한 번 더 두어 남의 노트를 겨냥한
    // 요청이 0행을 고치고 조용히 끝나는 대신 눈에 보이게 한다.
    .eq("owner_id", userId)
    .select("share_token")
    .maybeSingle<{ share_token: string | null }>();

  if (error || !data?.share_token) throw new Error("공유 링크를 만들지 못했습니다.");

  revalidatePath("/", "layout");
  return data.share_token;
}

/**
 * 공유를 끈다. 열쇠를 지우므로 나눠 준 링크는 그 자리에서 열리지 않는다.
 * 다시 켜면 새 열쇠가 나온다.
 */
export async function stopSharing(noteId: string) {
  const { supabase, userId } = await session();

  const { error } = await supabase
    .from("notes")
    .update({ share_token: null, shared_at: null })
    .eq("id", noteId)
    .eq("owner_id", userId);

  if (error) throw new Error("공유를 끄지 못했습니다.");
  revalidatePath("/", "layout");
}
