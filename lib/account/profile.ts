import { cache } from "react";
import { createClient, currentUser } from "@/lib/supabase/server";

export interface Profile {
  username: string | null;
  locale: string | null;
  default_background: unknown;
}

/**
 * 지금 로그인한 사람의 프로필 한 줄.
 * 표시 이름, 언어, 기본 배경을 저마다 따로 읽으면 같은 행을 화면 한 장에
 * 여러 번 조회하게 된다. 한 번 읽어 필요한 곳에서 나눠 쓴다.
 */
export const currentProfile = cache(async (): Promise<Profile | null> => {
  const user = await currentUser();
  if (!user) return null;

  const supabase = await createClient();
  const { data } = await supabase
    .from("profiles")
    .select("username, locale, default_background")
    .eq("id", user.id)
    .maybeSingle<Profile>();

  return data ?? null;
});

/** 좌측 패널 머리에 쓰는 이름. 프로필에 없으면 로그인한 주소로 대신한다. */
export async function displayName(): Promise<string> {
  const [user, profile] = await Promise.all([currentUser(), currentProfile()]);
  return profile?.username ?? user?.email ?? "";
}
