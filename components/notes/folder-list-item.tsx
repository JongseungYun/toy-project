"use client";

import Link from "next/link";
import { FolderIcon, FolderOpenIcon } from "@phosphor-icons/react";
import type { FolderSummary } from "@/lib/notes/folders";
import { cn } from "@/lib/utils";
import { useNoteDrop } from "@/components/notes/use-note-drop";
import { format, type Messages } from "@/lib/i18n/messages";

/**
 * 좌측 목록의 폴더 한 줄. 노트와 같은 모양이고, 누르면 그 안으로 들어간다.
 * 노트를 끌어다 놓으면 이 폴더로 옮긴다.
 */
export function FolderListItem({
  folder,
  t,
}: {
  folder: FolderSummary;
  t: Messages;
}) {
  const { over, pending, dropProps } = useNoteDrop(folder.id);

  const parts = [format(t.folder.noteCount, { count: folder.noteCount })];
  if (folder.childFolderCount > 0) {
    parts.push(format(t.folder.childFolderCount, { count: folder.childFolderCount }));
  }

  return (
    <Link
      href={`/?folder=${folder.id}`}
      data-testid="folder-item"
      data-dropping={over || undefined}
      {...dropProps}
      className={cn(
        "flex w-full items-center gap-2.5 rounded-xl border border-transparent p-1.5 text-left transition-colors hover:bg-sidebar-accent",
        over && "border-ring bg-sidebar-accent",
        pending && "opacity-60",
      )}
    >
      <span
        className={cn(
          "flex size-14 flex-none items-center justify-center rounded-md border border-sidebar-border bg-card text-muted-foreground",
          over && "border-ring text-foreground",
        )}
      >
        {over ? <FolderOpenIcon className="size-6" /> : <FolderIcon className="size-6" />}
      </span>
      <span className="min-w-0 flex-1">
        <span className="block truncate text-[13px] font-semibold">{folder.name}</span>
        <span className="mt-0.5 block truncate text-[11px] text-muted-foreground">
          {over ? t.folder.dropHere : parts.join(" · ")}
        </span>
      </span>
    </Link>
  );
}
