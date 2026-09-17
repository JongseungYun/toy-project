"use client";

import { useTransition } from "react";
import {
  FileTextIcon,
  FolderIcon,
  MarkdownLogoIcon,
  PencilSimpleIcon,
} from "@phosphor-icons/react";
import { purgeTrashed, restoreTrashed } from "@/lib/notes/folder-actions";
import { formatLabel, formatUpdatedAt } from "@/lib/notes/display";
import type { TrashEntry } from "@/lib/notes/trash";
import { Button } from "@/components/ui/button";
import { useLocale, useMessages } from "@/components/i18n-provider";
import { format } from "@/lib/i18n/messages";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";

const FORMAT_ICON = {
  doc: FileTextIcon,
  markdown: MarkdownLogoIcon,
  canvas: PencilSimpleIcon,
};

/** 휴지통의 한 줄. 되돌리기와 영구 삭제를 고를 수 있다. */
export function TrashRow({ entry }: { entry: TrashEntry }) {
  const t = useMessages();
  const locale = useLocale();
  const [pending, startTransition] = useTransition();

  const Icon =
    entry.kind === "folder" ? FolderIcon : FORMAT_ICON[entry.format ?? "doc"];

  const when = formatUpdatedAt(entry.deletedAt, {
    locale,
    yesterday: t.note.yesterday,
  });
  const meta = [
    entry.kind === "folder" ? t.trash.folder : formatLabel(t, entry.format ?? "doc"),
    entry.sweptCount > 0
      ? format(t.trash.sweptCount, { count: entry.sweptCount })
      : null,
    format(t.trash.deletedAt, { time: when }),
  ].filter(Boolean);

  return (
    <div
      data-testid="trash-row"
      className="flex flex-wrap items-center gap-2 rounded-2xl border border-border bg-card px-4 py-3"
    >
      <Icon className="size-5 flex-none text-muted-foreground" />
      <span className="min-w-45 flex-1">
        <span className="block truncate text-[13px] font-semibold">{entry.title}</span>
        <span className="mt-0.5 block text-[11px] text-muted-foreground">
          {meta.join(" · ")}
        </span>
      </span>

      <Button
        variant="outline"
        size="sm"
        disabled={pending}
        onClick={() => startTransition(async () => await restoreTrashed(entry.id))}
      >
        {t.trash.restore}
      </Button>

      <AlertDialog>
        <AlertDialogTrigger
          render={
            <Button variant="ghost" size="sm" disabled={pending}>
              {t.trash.purge}
            </Button>
          }
        />
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>
              {format(t.trash.purgeTitle, { name: entry.title })}
            </AlertDialogTitle>
            <AlertDialogDescription>
              {t.trash.purgeBody}
              {entry.sweptCount > 0 &&
                ` ${format(t.trash.purgeSwept, { count: entry.sweptCount })}`}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>{t.trash.cancel}</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => startTransition(async () => await purgeTrashed(entry.id))}
            >
              {t.trash.purge}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
