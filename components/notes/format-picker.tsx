"use client";

import { useState, useTransition } from "react";
import {
  FileTextIcon,
  MarkdownLogoIcon,
  PencilSimpleIcon,
  PlusIcon,
} from "@phosphor-icons/react";
import { createNote } from "@/lib/notes/actions";
import type { NoteFormat } from "@/lib/notes/types";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Spinner } from "@/components/ui/spinner";
import { useMessages } from "@/components/i18n-provider";
import type { Messages } from "@/lib/i18n/messages";

// 스펙이 정한 세 형식. 노트마다 하나를 고르고, 만든 뒤에는 바꾸지 않는다.
const CREATABLE_FORMATS: { format: NoteFormat; icon: typeof FileTextIcon }[] = [
  { format: "doc", icon: FileTextIcon },
  { format: "markdown", icon: MarkdownLogoIcon },
  { format: "canvas", icon: PencilSimpleIcon },
];

const DESCRIPTION = {
  doc: "docDesc",
  markdown: "markdownDesc",
  canvas: "canvasDesc",
} as const;

function FormatCards({
  onPick,
  pending,
  picked,
  t,
}: {
  onPick: (format: NoteFormat) => void;
  pending: boolean;
  /** 방금 고른 형식. 만들어지는 동안 그 카드에만 스피너를 둔다. */
  picked: NoteFormat | null;
  t: Messages;
}) {
  return (
    <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
      {CREATABLE_FORMATS.map(({ format, icon: Icon }) => (
        <button
          key={format}
          type="button"
          disabled={pending}
          onClick={() => onPick(format)}
          className="flex flex-col items-center gap-2 rounded-2xl border border-border bg-card p-4 text-center transition-colors hover:border-primary hover:bg-accent disabled:opacity-60"
        >
          <span className="flex h-16 w-full items-center justify-center rounded-xl bg-muted text-muted-foreground">
            {picked === format ? (
              <Spinner className="size-7" />
            ) : (
              <Icon className="size-7" />
            )}
          </span>
          <span className="text-sm font-semibold">{t.format[format]}</span>
          <span className="text-xs text-muted-foreground">
            {t.format[DESCRIPTION[format]]}
          </span>
        </button>
      ))}
    </div>
  );
}

/**
 * 새 노트 만들기. 좌측 패널 맨 위의 빈 카드와 빈 보관함 안내가 같은 창을 연다.
 * variant는 여는 자리만 다르게 하고 창의 내용은 하나로 둔다.
 */
export function FormatPicker({
  variant,
  folderId = null,
}: {
  variant: "card" | "button";
  /** 지금 열려 있는 폴더. 새 노트는 이 안에 만들어진다. */
  folderId?: string | null;
}) {
  const t = useMessages();
  const [open, setOpen] = useState(false);
  const [picked, setPicked] = useState<NoteFormat | null>(null);
  const [pending, startTransition] = useTransition();

  function pick(format: NoteFormat) {
    setPicked(format);
    startTransition(async () => {
      await createNote(format, folderId);
    });
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger
        render={
          variant === "card" ? (
            <button
              type="button"
              className="flex h-20 w-full flex-col items-center justify-center gap-1.5 rounded-2xl border border-dashed border-sidebar-border bg-sidebar text-xs text-muted-foreground transition-colors hover:border-primary hover:bg-sidebar-accent hover:text-primary"
            >
              <PlusIcon className="size-5" />
              {t.library.newNote}
            </button>
          ) : (
            <Button>{t.library.newNote}</Button>
          )
        }
      />
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>{t.format.pickerTitle}</DialogTitle>
          <DialogDescription>
            {t.format.pickerLead}
          </DialogDescription>
        </DialogHeader>
        {/* 만드는 중일 때만 스피너를 둔다. 끝나거나 취소한 뒤에는 남기지 않는다. */}
        <FormatCards
          onPick={pick}
          pending={pending}
          picked={pending ? picked : null}
          t={t}
        />
        <DialogFooter>
          <Button variant="outline" onClick={() => setOpen(false)} disabled={pending}>
            {t.format.cancel}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
