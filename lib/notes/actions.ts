"use server";

import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { parseBackground } from "@/lib/notes/background";
import { isNoteFormat, type NoteContent, type NoteFormat } from "@/lib/notes/types";

/** 새 노트를 만들고 바로 편집 화면으로 보낸다. 지금 열려 있는 폴더 안에 만든다. */
export async function createNote(format: NoteFormat, folderId: string | null = null) {
  if (!isNoteFormat(format)) {
    throw new Error(`알 수 없는 형식입니다: ${format}`);
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  // 설정에서 정한 기본 배경으로 시작한다. 이미 만든 노트는 건드리지 않는다.
  const { data: profile } = await supabase
    .from("profiles")
    .select("default_background")
    .eq("id", user.id)
    .maybeSingle();

  const { data, error } = await supabase
    .from("notes")
    .insert({
      owner_id: user.id,
      format,
      folder_id: folderId,
      background: parseBackground(profile?.default_background),
    })
    .select("id")
    .single();

  if (error || !data) {
    throw new Error("노트를 만들지 못했습니다.");
  }

  redirect(`/notes/${data.id}`);
}

export interface SaveNoteInput {
  id: string;
  title: string;
  content: NoteContent;
  preview: string;
  /** 내가 불러왔을 때의 버전. 그 사이 다른 기기가 저장했으면 값이 어긋난다. */
  baseVersion: number;
}

export type SaveNoteResult =
  | { status: "saved"; version: number; updatedAt: string }
  | {
      status: "conflict";
      latest: {
        title: string;
        content: NoteContent;
        version: number;
        updatedAt: string;
      };
    }
  | { status: "error"; message: string };

/**
 * 자동 저장의 종착점. version이 내가 불러온 값과 같을 때만 쓴다.
 * 어긋나면 덮지 않고 저장소에 있는 최신 내용을 그대로 돌려준다. 어느 쪽을
 * 남길지는 사용자가 고른다(components/notes/note-editor.tsx).
 */
export async function saveNote(input: SaveNoteInput): Promise<SaveNoteResult> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return { status: "error", message: "로그인이 풀렸습니다." };
  }

  const { data, error } = await supabase
    .from("notes")
    .update({
      title: input.title,
      content: input.content,
      preview: input.preview,
      version: input.baseVersion + 1,
    })
    .eq("id", input.id)
    .eq("version", input.baseVersion)
    .select("version, updated_at")
    .maybeSingle();

  if (error) {
    return { status: "error", message: "저장하지 못했습니다." };
  }

  if (data) {
    return { status: "saved", version: data.version, updatedAt: data.updated_at };
  }

  // 한 행도 바뀌지 않았다. 버전이 어긋났거나 노트가 사라진 경우다.
  const { data: latest } = await supabase
    .from("notes")
    .select("title, content, version, updated_at")
    .eq("id", input.id)
    .maybeSingle();

  if (!latest) {
    return { status: "error", message: "노트를 찾을 수 없습니다." };
  }

  return {
    status: "conflict",
    latest: {
      title: latest.title,
      content: latest.content ?? {},
      version: latest.version,
      updatedAt: latest.updated_at,
    },
  };
}
