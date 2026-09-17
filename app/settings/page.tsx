import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { ArrowLeftIcon, GlobeIcon, InfoIcon } from "@phosphor-icons/react/ssr";
import { createClient } from "@/lib/supabase/server";
import { signOut } from "@/lib/account/actions";
import { parseBackground } from "@/lib/notes/background";
import { getMessages } from "@/lib/i18n/server";
import { isLocale } from "@/lib/i18n/locales";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { DefaultBackgroundRow } from "@/components/notes/default-background-row";
import { LanguageRow } from "@/components/notes/language-row";

export async function generateMetadata(): Promise<Metadata> {
  const { t } = await getMessages();
  return { title: `${t.settings.title} — ${t.app.name}` };
}

export default async function SettingsPage() {
  const { locale, t } = await getMessages();

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    redirect("/login");
  }

  const { data: profile } = await supabase
    .from("profiles")
    .select("username, default_background, locale")
    .eq("id", user.id)
    .maybeSingle();

  // 아직 고르지 않았으면 이번 요청의 언어를 고른 것처럼 보여준다.
  const saved = isLocale(profile?.locale) ? profile.locale : locale;

  return (
    <div className="mx-auto flex min-h-svh max-w-2xl flex-col gap-6 p-6">
      <div className="flex items-center gap-3">
        <Button
          variant="ghost"
          size="icon-sm"
          render={<Link href="/" aria-label={t.settings.back} />}
          nativeButton={false}
        >
          <ArrowLeftIcon />
        </Button>
        <h1 className="text-lg font-semibold">{t.settings.title}</h1>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>{t.settings.account}</CardTitle>
        </CardHeader>
        <CardContent className="flex flex-col gap-5">
          {profile?.username ? (
            <div className="flex flex-col gap-1">
              <p className="text-sm font-medium">{t.settings.usernameLabel}</p>
              <p className="text-sm text-muted-foreground">
                {t.settings.usernameBody}{" "}
                <span className="font-medium text-foreground">{profile.username}</span>
              </p>
            </div>
          ) : (
            <div className="flex flex-col gap-1">
              <p className="text-sm font-medium">{t.settings.linkedAccount}</p>
              <p className="text-sm text-muted-foreground">
                {t.settings.linkedBody}{" "}
                <span className="font-medium text-foreground">{user.email}</span>
              </p>
            </div>
          )}

          <div className="flex items-center justify-between gap-4">
            <div className="flex flex-col gap-1">
              <p className="text-sm font-medium">{t.settings.signOut}</p>
              <p className="text-sm text-muted-foreground">{t.settings.signOutBody}</p>
            </div>
            <form action={signOut}>
              <Button type="submit" variant="outline">
                {t.settings.signOut}
              </Button>
            </form>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <GlobeIcon className="size-4" />
            {t.settings.language}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <LanguageRow locale={saved} />
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>{t.background.defaultTitle}</CardTitle>
        </CardHeader>
        <CardContent>
          <DefaultBackgroundRow
            background={parseBackground(profile?.default_background)}
          />
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <InfoIcon className="size-4" />
            {t.settings.about}
          </CardTitle>
        </CardHeader>
        <CardContent className="flex flex-col gap-1">
          <p className="text-sm font-medium">{t.settings.aboutLabel}</p>
          <p className="text-sm text-muted-foreground">{t.app.version}</p>
          <p className="text-sm text-muted-foreground">{t.settings.aboutBody}</p>
        </CardContent>
      </Card>
    </div>
  );
}
