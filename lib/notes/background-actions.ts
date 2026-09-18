"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createClient, currentUser } from "@/lib/supabase/server";
import {
  BACKGROUND_BUCKET,
  parseBackground,
  type NoteBackground,
} from "@/lib/notes/background";

async function session() {
  const [user, supabase] = await Promise.all([currentUser(), createClient()]);
  if (!user) redirect("/login");
  return { supabase, userId: user.id };
}

/** 올린 이미지가 정말 내 칸에 있는지 확인한다. 경로는 항상 <내 id>/로 시작한다. */
function ownsPath(background: NoteBackground, userId: string): boolean {
  if (background.kind !== "image") return true;
  return background.path.startsWith(`${userId}/`);
}

/** 노트 하나의 배경을 바꾼다. */
export async function setNoteBackground(noteId: string, raw: unknown) {
  const { supabase, userId } = await session();
  const background = parseBackground(raw);

  if (!ownsPath(background, userId)) {
    throw new Error("내 계정의 이미지가 아닙니다.");
  }

  const { error } = await supabase
    .from("notes")
    .update({ background })
    .eq("id", noteId);

  if (error) throw new Error("배경을 바꾸지 못했습니다.");
  revalidatePath("/", "layout");
}

/**
 * 설정의 기본 배경. 그 뒤에 만드는 노트가 이 배경으로 시작하고,
 * 이미 만든 노트는 건드리지 않는다.
 */
export async function setDefaultBackground(raw: unknown) {
  const { supabase, userId } = await session();
  const background = parseBackground(raw);

  if (!ownsPath(background, userId)) {
    throw new Error("내 계정의 이미지가 아닙니다.");
  }

  const { error } = await supabase
    .from("profiles")
    .update({ default_background: background })
    .eq("id", userId);

  if (error) throw new Error("기본 배경을 바꾸지 못했습니다.");
  revalidatePath("/", "layout");
}

/**
 * 비공개 버킷의 이미지를 화면에 띄우려면 서명된 주소가 필요하다.
 * 만료되면 다음 렌더에서 새로 받는다.
 */
export async function signBackgroundUrl(path: string): Promise<string | null> {
  const { supabase } = await session();

  const { data } = await supabase.storage
    .from(BACKGROUND_BUCKET)
    .createSignedUrl(path, 60 * 60);

  return data?.signedUrl ?? null;
}
