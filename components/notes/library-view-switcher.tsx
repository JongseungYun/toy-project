"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";
import { useMessages } from "@/components/i18n-provider";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
import { libraryHref, type LibraryView } from "@/lib/notes/library-view";
import type { ResolvedSort } from "@/lib/notes/sort";

export function LibraryViewSwitcher({
  view,
  sort,
  folderId,
}: {
  view: LibraryView | null;
  sort: ResolvedSort;
  folderId: string | null;
}) {
  const t = useMessages();
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  return (
    <ToggleGroup
      value={view ? [view] : []}
      variant="outline"
      size="sm"
      spacing={0}
      className="w-full"
      aria-label={t.library.viewLabel}
      disabled={pending}
      onValueChange={(values) => {
        const next = values[0];
        if (next !== "folder" && next !== "all" && next !== "pinned") return;
        startTransition(() => router.push(libraryHref(next, sort, folderId)));
      }}
    >
      <ToggleGroupItem value="folder" className="min-w-0 flex-1">
        {t.library.folderView}
      </ToggleGroupItem>
      <ToggleGroupItem value="all" className="min-w-0 flex-1">
        {t.library.allView}
      </ToggleGroupItem>
      <ToggleGroupItem value="pinned" className="min-w-0 flex-1">
        {t.library.pinnedView}
      </ToggleGroupItem>
    </ToggleGroup>
  );
}
