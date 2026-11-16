"use server";

import { revalidatePath } from "next/cache";
import { createClient, currentUser } from "@/lib/supabase/server";
import { currentProfile } from "@/lib/account/profile";
import { parseBackground } from "@/lib/notes/background";
import { previewFromMarkdown } from "@/lib/notes/display";
import { rejectMarkdownFile, type MarkdownImportProblem } from "@/lib/notes/markdown-import";

type ImportResult = { id: string } | { problem: MarkdownImportProblem };

export async function importMarkdown(form: FormData): Promise<ImportResult> {
  const user = await currentUser();
  if (!user) return { problem: "loginRequired" };
  const file = form.get("file");
  const id = form.get("requestId");
  if (!(file instanceof File)) return { problem: "unsupported" };
  if (typeof id !== "string" || !/^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(id)) {
    return { problem: "failed" };
  }
  const problem = rejectMarkdownFile(file);
  if (problem) return { problem };

  let source: string;
  try {
    source = new TextDecoder("utf-8", { fatal: true }).decode(await file.arrayBuffer());
  } catch {
    return { problem: "encoding" };
  }
  if (source.includes("\0")) return { problem: "encoding" };

  const [profile, supabase] = await Promise.all([currentProfile(), createClient()]);
  const { error } = await supabase.from("notes").insert({
    id,
    owner_id: user.id,
    format: "markdown",
    title: file.name.replace(/\.md$/i, ""),
    content: { source, viewer: true },
    preview: previewFromMarkdown(source),
    background: parseBackground(profile?.default_background),
  });

  if (error) {
    if (error.code !== "23505") return { problem: "failed" };
    // 저장 응답을 잃어 같은 요청을 재시도하면 이미 만든 노트로 돌아간다.
    const { data: existing } = await supabase.from("notes").select("id")
      .eq("id", id).eq("owner_id", user.id).is("deleted_at", null).maybeSingle();
    if (!existing) return { problem: "failed" };
  }
  revalidatePath("/");
  return { id };
}
