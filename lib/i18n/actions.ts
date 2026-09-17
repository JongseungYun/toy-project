"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { isLocale } from "@/lib/i18n/locales";

/**
 * 표시 언어를 계정에 저장한다. 계정에 남기므로 다른 기기에서 열어도 그대로다.
 * 노트 제목과 본문은 건드리지 않는다. 번역 대상은 화면 문구뿐이다.
 */
export async function setDisplayLocale(locale: string) {
  if (!isLocale(locale)) {
    throw new Error(`지원하지 않는 언어입니다: ${locale}`);
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { error } = await supabase
    .from("profiles")
    .update({ locale })
    .eq("id", user.id);

  if (error) throw new Error("표시 언어를 바꾸지 못했습니다.");

  // 모든 화면의 문구가 새 언어로 다시 그려져야 한다.
  revalidatePath("/", "layout");
}
