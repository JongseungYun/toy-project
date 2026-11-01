import type { ResolvedSort } from "./sort";

export type LibraryView = "folder" | "all" | "pinned";

export function resolveLibraryView(
  value: string | string[] | undefined,
): LibraryView {
  const view = Array.isArray(value) ? value[0] : value;
  return view === "all" || view === "pinned" ? view : "folder";
}

export function libraryHref(
  view: LibraryView,
  sort: ResolvedSort,
  folderId: string | null = null,
): string {
  const params = new URLSearchParams({
    sort: sort.key,
    dir: sort.ascending ? "asc" : "desc",
  });
  if (view === "folder") {
    if (folderId) params.set("folder", folderId);
  } else params.set("view", view);
  return `/?${params}`;
}

export function noteHref(
  id: string,
  view: LibraryView,
  sort: ResolvedSort,
): string {
  if (view === "folder") return `/notes/${id}`;
  const params = new URLSearchParams({
    view,
    sort: sort.key,
    dir: sort.ascending ? "asc" : "desc",
  });
  return `/notes/${id}?${params}`;
}
