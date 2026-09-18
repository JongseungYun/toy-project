"use client";

import type { ReactNode } from "react";
import Link from "next/link";
import { ArrowLeftIcon, WarningIcon } from "@phosphor-icons/react";
import { formatUpdatedAt, untitledTitle } from "@/lib/notes/display";
import type { NoteFormat } from "@/lib/notes/types";
import { Button } from "@/components/ui/button";
import { Spinner } from "@/components/ui/spinner";
import type { RemoteNote, SaveStatus } from "@/components/notes/use-note-autosave";
import { useLocale, useMessages } from "@/components/i18n-provider";
import { format, type Messages } from "@/lib/i18n/messages";
import type { Locale } from "@/lib/i18n/locales";

function SaveIndicator({
  t,
  locale,
  status,
  savedAt,
  savedCount,
  onRetry,
}: {
  t: Messages;
  locale: Locale;
  status: SaveStatus;
  savedAt: string;
  savedCount: number;
  onRetry: () => void;
}) {
  if (status === "saving") {
    return (
      <span
        data-testid="save-state"
        data-state="saving"
        data-saved-count={savedCount}
        className="flex items-center gap-1.5 text-xs text-muted-foreground"
      >
        <Spinner className="size-3.5" />
        {t.note.saving}
      </span>
    );
  }

  if (status === "error") {
    return (
      <button
        type="button"
        data-testid="save-state"
        data-state="error"
        data-saved-count={savedCount}
        onClick={onRetry}
        className="flex items-center gap-1.5 text-xs font-medium text-destructive"
      >
        <WarningIcon className="size-3.5" />
        {t.note.saveFailed}
      </button>
    );
  }

  return (
    <span
      data-testid="save-state"
      data-state="saved"
      data-saved-count={savedCount}
      className="flex items-center gap-1.5 text-xs text-muted-foreground"
    >
      <span className="size-1.5 rounded-full bg-emerald-500" />
      {format(t.note.saved, { time: formatUpdatedAt(savedAt, { locale, yesterday: t.note.yesterday }) })}
    </span>
  );
}

/**
 * 형식과 무관하게 같은 노트 머리말과 충돌 알림. 세 형식이 같은 자리에서
 * 제목을 고치고 같은 방식으로 저장 상태를 본다. 형식마다 다른 도구는
 * actions로 머리말 오른쪽에 붙는다.
 */
export function NoteFrame({
  format,
  title,
  onTitleChange,
  status,
  savedAt,
  savedCount,
  onRetry,
  remote,
  onTakeRemote,
  onKeepMine,
  actions,
  children,
}: {
  format: NoteFormat;
  title: string;
  onTitleChange: (value: string) => void;
  status: SaveStatus;
  savedAt: string;
  savedCount: number;
  onRetry: () => void;
  remote: RemoteNote | null;
  onTakeRemote: () => void;
  onKeepMine: () => void;
  actions?: ReactNode;
  children: ReactNode;
}) {
  const t = useMessages();
  const locale = useLocale();

  return (
    <>
      <div className="flex items-center gap-2 border-b border-border px-3 py-2">
        <Button
          variant="ghost"
          size="icon-sm"
          className="sm:hidden"
          render={<Link href="/" aria-label={t.library.backToList} />}
          nativeButton={false}
        >
          <ArrowLeftIcon />
        </Button>
        <input
          value={title}
          onChange={(event) => onTitleChange(event.target.value)}
          aria-label={t.note.titleLabel}
          placeholder={untitledTitle(t, format)}
          className="min-w-0 flex-1 rounded-sm border border-transparent bg-transparent px-1.5 py-1 text-[15px] font-semibold outline-none focus:border-border"
        />
        <SaveIndicator
          t={t}
          locale={locale}
          status={status}
          savedAt={savedAt}
          savedCount={savedCount}
          onRetry={onRetry}
        />
        {actions}
      </div>

      {remote && (
        <div
          role="alert"
          className="flex flex-wrap items-center gap-2 border-b border-border bg-muted px-3 py-2 text-sm"
        >
          <span className="min-w-45 flex-1">
            {t.note.conflict}
          </span>
          <Button size="sm" variant="outline" onClick={onTakeRemote}>
            {t.note.takeRemote}
          </Button>
          <Button size="sm" onClick={onKeepMine}>
            {t.note.keepMine}
          </Button>
        </div>
      )}

      {children}
    </>
  );
}
