import type { Metadata } from "next";
import { MagnifyingGlassIcon } from "@phosphor-icons/react/ssr";
import { displayName } from "@/lib/account/profile";
import { getMessages } from "@/lib/i18n/server";
import { listAllFolders } from "@/lib/notes/folders";
import { searchNotes } from "@/lib/notes/queries";
import { normalizeSearchText } from "@/lib/notes/search";
import { resolveSort } from "@/lib/notes/sort";
import { LibraryShell } from "@/components/notes/library-shell";
import {
  Empty,
  EmptyDescription,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
} from "@/components/ui/empty";

export async function generateMetadata(): Promise<Metadata> {
  const { t } = await getMessages();
  return { title: `${t.search.label} — ${t.app.name}` };
}

export default async function SearchPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string | string[] }>;
}) {
  const { t, locale } = await getMessages();
  const params = await searchParams;
  const query = normalizeSearchText(
    typeof params.q === "string" ? params.q : "",
  );
  const [name, result, folders] = await Promise.all([
    displayName(),
    searchNotes(query),
    listAllFolders(),
  ]);
  return (
    <LibraryShell
      displayName={name}
      t={t}
      locale={locale}
      crumbs={[{ id: null, name: t.library.root }]}
      folders={[]}
      notes={[]}
      sort={resolveSort({})}
      backgroundUrls={{}}
      search={{
        query,
        results: result.ok ? result.data : [],
        failed: !result.ok || !folders.ok,
        folders: folders.ok ? folders.data : [],
      }}
    >
      <div className="flex min-h-0 flex-1 items-center justify-center p-6">
        <Empty>
          <EmptyHeader>
            <EmptyMedia variant="icon">
              <MagnifyingGlassIcon />
            </EmptyMedia>
            <EmptyTitle>{t.search.results}</EmptyTitle>
            <EmptyDescription>{t.search.pickBody}</EmptyDescription>
          </EmptyHeader>
        </Empty>
      </div>
    </LibraryShell>
  );
}
