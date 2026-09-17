"use client";

import { useTransition } from "react";
import {
  FileTextIcon,
  FolderIcon,
  MarkdownLogoIcon,
  PencilSimpleIcon,
} from "@phosphor-icons/react";
import { purgeTrashed, restoreTrashed } from "@/lib/notes/folder-actions";
import { FORMAT_LABEL, formatUpdatedAt } from "@/lib/notes/display";
import type { TrashEntry } from "@/lib/notes/trash";
import { Button } from "@/components/ui/button";
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
  const [pending, startTransition] = useTransition();

  const Icon =
    entry.kind === "folder" ? FolderIcon : FORMAT_ICON[entry.format ?? "doc"];

  const meta = [
    entry.kind === "folder" ? "폴더" : FORMAT_LABEL[entry.format ?? "doc"],
    entry.sweptCount > 0 ? `${entry.sweptCount}개 함께 들어옴` : null,
    `${formatUpdatedAt(entry.deletedAt)} 삭제`,
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
        되돌리기
      </Button>

      <AlertDialog>
        <AlertDialogTrigger
          render={
            <Button variant="ghost" size="sm" disabled={pending}>
              영구 삭제
            </Button>
          }
        />
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{entry.title}을(를) 영구 삭제할까요?</AlertDialogTitle>
            <AlertDialogDescription>
              돌이킬 수 없습니다.
              {entry.sweptCount > 0 &&
                ` 함께 들어온 ${entry.sweptCount}개도 같이 사라집니다.`}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>취소</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => startTransition(async () => await purgeTrashed(entry.id))}
            >
              영구 삭제
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
