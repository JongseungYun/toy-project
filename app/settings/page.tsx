import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { ArrowLeftIcon } from "@phosphor-icons/react/ssr";
import { createClient } from "@/lib/supabase/server";
import { signOut } from "@/lib/account/actions";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { parseBackground } from "@/lib/notes/background";
import { DefaultBackgroundRow } from "@/components/notes/default-background-row";

export const metadata: Metadata = {
  title: "설정 — 아무노트",
};

export default async function SettingsPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    redirect("/login");
  }

  const { data: profile } = await supabase
    .from("profiles")
    .select("username, default_background")
    .eq("id", user.id)
    .maybeSingle();

  return (
    <div className="mx-auto flex min-h-svh max-w-2xl flex-col gap-6 p-6">
      <div className="flex items-center gap-3">
        <Button
          variant="ghost"
          size="icon-sm"
          render={<Link href="/" aria-label="보관함으로 돌아가기" />}
          nativeButton={false}
        >
          <ArrowLeftIcon />
        </Button>
        <h1 className="text-lg font-semibold">설정</h1>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>계정</CardTitle>
        </CardHeader>
        <CardContent className="flex flex-col gap-5">
          {profile?.username ? (
            <div className="flex flex-col gap-1">
              <p className="text-sm font-medium">아이디</p>
              <p className="text-sm text-muted-foreground">
                가입할 때 정한 아이디입니다. 바꿀 수 없습니다.{" "}
                <span className="font-medium text-foreground">{profile.username}</span>
              </p>
            </div>
          ) : (
            <div className="flex flex-col gap-1">
              <p className="text-sm font-medium">연결된 계정</p>
              <p className="text-sm text-muted-foreground">
                Google 계정으로 로그인했습니다.{" "}
                <span className="font-medium text-foreground">{user.email}</span>
              </p>
            </div>
          )}

          <div className="flex items-center justify-between gap-4">
            <div className="flex flex-col gap-1">
              <p className="text-sm font-medium">로그아웃</p>
              <p className="text-sm text-muted-foreground">
                이 기기에서만 나갑니다. 다른 기기는 그대로입니다.
              </p>
            </div>
            <form action={signOut}>
              <Button type="submit" variant="outline">
                로그아웃
              </Button>
            </form>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>기본 배경</CardTitle>
        </CardHeader>
        <CardContent>
          <DefaultBackgroundRow
            background={parseBackground(profile?.default_background)}
          />
        </CardContent>
      </Card>
    </div>
  );
}
