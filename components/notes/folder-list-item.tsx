import Link from "next/link";
import { FolderIcon } from "@phosphor-icons/react/ssr";
import type { FolderSummary } from "@/lib/notes/folders";

/** 좌측 목록의 폴더 한 줄. 노트와 같은 모양이고, 누르면 그 안으로 들어간다. */
export function FolderListItem({ folder }: { folder: FolderSummary }) {
  const parts = [`노트 ${folder.noteCount}개`];
  if (folder.childFolderCount > 0) {
    parts.push(`하위 폴더 ${folder.childFolderCount}개`);
  }

  return (
    <Link
      href={`/?folder=${folder.id}`}
      data-testid="folder-item"
      className="flex w-full items-center gap-2.5 rounded-xl border border-transparent p-1.5 text-left transition-colors hover:bg-sidebar-accent"
    >
      <span className="flex size-14 flex-none items-center justify-center rounded-md border border-sidebar-border bg-card text-muted-foreground">
        <FolderIcon className="size-6" />
      </span>
      <span className="min-w-0 flex-1">
        <span className="block truncate text-[13px] font-semibold">{folder.name}</span>
        <span className="mt-0.5 block text-[11px] text-muted-foreground">
          {parts.join(" · ")}
        </span>
      </span>
    </Link>
  );
}
