import type { Metadata } from "next";
import Link from "next/link";
import { LinkBreakIcon, NotePencilIcon } from "@phosphor-icons/react/ssr";
import { backgroundStyle, parseBackground } from "@/lib/notes/background";
import { displayTitle, formatLabel, formatUpdatedAt } from "@/lib/notes/display";
import { getSharedNote } from "@/lib/notes/queries";
import { getMessages } from "@/lib/i18n/server";
import { NoteReader } from "@/components/notes/note-reader";
import { Button } from "@/components/ui/button";
import {
  Empty,
  EmptyDescription,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
} from "@/components/ui/empty";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ token: string }>;
}): Promise<Metadata> {
  const { t } = await getMessages();
  const note = await getSharedNote((await params).token);

  return {
    title: note ? `${displayTitle(note, t)} — ${t.app.name}` : t.app.name,
    // 링크를 받은 사람만 보라고 만든 주소다. 검색 결과로 흘러 다니지 않게 한다.
    robots: { index: false, follow: false },
  };
}

/**
 * 읽기 전용 공유 화면. 로그인하지 않아도 열린다.
 *
 * 배경은 색만 따라간다. 올린 이미지는 그 계정만 닿을 수 있는 자리에 있어,
 * 링크를 받은 사람에게는 서명된 주소를 만들어 줄 수 없다.
 * docs/decisions/note-sharing.md 참고.
 */
export default async function SharedNotePage({
  params,
}: {
  params: Promise<{ token: string }>;
}) {
  const { locale, t } = await getMessages();
  const { token } = await params;
  const note = await getSharedNote(token);

  return (
    <div className="flex min-h-svh flex-col bg-muted p-4 sm:p-6">
      <div className="mx-auto flex w-full max-w-3xl flex-1 flex-col overflow-hidden rounded-3xl bg-card shadow-md ring-1 ring-foreground/5">
        {note ? (
          <>
            <header className="flex flex-wrap items-center gap-2 border-b border-border px-4 py-3">
              <h1 className="min-w-0 flex-1 truncate text-[15px] font-semibold">
                {displayTitle(note, t)}
              </h1>
              <span className="rounded-full border border-border bg-muted px-2 py-px text-[10px] whitespace-nowrap">
                {formatLabel(t, note.format)}
              </span>
              <span className="rounded-full border border-border bg-muted px-2 py-px text-[10px] whitespace-nowrap">
                {t.share.readOnly}
              </span>
              <span className="text-xs text-muted-foreground">
                {formatUpdatedAt(note.updatedAt, {
                  locale,
                  yesterday: t.note.yesterday,
                })}
              </span>
            </header>

            <div className="min-h-0 flex-1 overflow-y-auto">
              <NoteReader
                format={note.format}
                content={note.content}
                surface={backgroundStyle(parseBackground(note.background), null)}
              />
            </div>
          </>
        ) : (
          <div className="flex flex-1 items-center justify-center p-6">
            <Empty>
              <EmptyHeader>
                <EmptyMedia variant="icon">
                  <LinkBreakIcon />
                </EmptyMedia>
                <EmptyTitle>{t.share.missingTitle}</EmptyTitle>
                <EmptyDescription>{t.share.missingBody}</EmptyDescription>
              </EmptyHeader>
            </Empty>
          </div>
        )}

        <footer className="flex flex-wrap items-center gap-2 border-t border-border px-4 py-3 text-xs text-muted-foreground">
          <NotePencilIcon className="size-4 text-sidebar-primary" />
          <span className="flex-1">{t.share.madeWith}</span>
          <Button variant="outline" size="sm" render={<Link href="/" />} nativeButton={false}>
            {t.share.tryApp}
          </Button>
        </footer>
      </div>
    </div>
  );
}
