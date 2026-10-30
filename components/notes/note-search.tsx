"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import {
  ArrowClockwiseIcon,
  MagnifyingGlassIcon,
  WarningCircleIcon,
} from "@phosphor-icons/react";
import { useMessages } from "@/components/i18n-provider";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Field, FieldGroup, FieldLabel } from "@/components/ui/field";
import {
  InputGroup,
  InputGroupAddon,
  InputGroupButton,
  InputGroupInput,
} from "@/components/ui/input-group";
import {
  Item,
  ItemContent,
  ItemDescription,
  ItemGroup,
  ItemTitle,
} from "@/components/ui/item";
import {
  Empty,
  EmptyContent,
  EmptyDescription,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
} from "@/components/ui/empty";
import { Spinner } from "@/components/ui/spinner";
import { format } from "@/lib/i18n/messages";
import { formatLabel, untitledTitle } from "@/lib/notes/display";
import {
  matchRanges,
  normalizeSearchText,
  searchHref,
  type NoteSearchResult,
} from "@/lib/notes/search";

export interface SearchPanelData {
  query: string;
  results: NoteSearchResult[];
  failed: boolean;
  folders: { id: string; label: string }[];
}

export function NoteSearchForm({ query = "" }: { query?: string }) {
  const t = useMessages();
  const router = useRouter();
  const pathname = usePathname();
  const params = useSearchParams();
  const [value, setValue] = useState(query);
  const [pending, startTransition] = useTransition();
  return (
    <form
      role="search"
      aria-label={t.search.label}
      onSubmit={(event) => {
        event.preventDefault();
        const phrase = normalizeSearchText(value);
        if (!phrase) return;
        startTransition(() => {
          if (pathname === "/search" && params.get("q") === phrase)
            router.refresh();
          else router.push(searchHref(phrase));
        });
      }}
    >
      <FieldGroup>
        <Field>
          <FieldLabel className="sr-only" htmlFor="note-search">
            {t.search.label}
          </FieldLabel>
          <InputGroup>
            <InputGroupInput
              id="note-search"
              type="search"
              name="q"
              value={value}
              placeholder={t.search.placeholder}
              enterKeyHint="search"
              onChange={(event) => setValue(event.target.value)}
              onKeyDown={(event) => {
                if (event.key === "Enter" && event.nativeEvent.isComposing)
                  event.preventDefault();
              }}
            />
            <InputGroupAddon align="inline-end">
              <InputGroupButton
                type="submit"
                size="icon-sm"
                disabled={pending || !value.trim()}
                aria-label={pending ? t.search.searching : t.search.submit}
              >
                {pending ? <Spinner /> : <MagnifyingGlassIcon />}
              </InputGroupButton>
            </InputGroupAddon>
          </InputGroup>
          {pending && (
            <span role="status" className="text-xs text-muted-foreground">
              {t.search.searching}
            </span>
          )}
        </Field>
      </FieldGroup>
    </form>
  );
}

function MatchedText({ text, query }: { text: string; query: string }) {
  const ranges = matchRanges(text, query);
  return (
    <>
      {ranges.map(({ start, end }, index) => {
        const before = text.slice(ranges[index - 1]?.end ?? 0, start);
        return (
          <span key={start}>
            {before}
            <mark className="rounded-sm bg-primary/15 text-foreground">
              {text.slice(start, end)}
            </mark>
          </span>
        );
      })}
      {text.slice(ranges.at(-1)?.end ?? 0)}
    </>
  );
}

export function NoteSearchResults({
  search,
  activeNoteId,
}: {
  search: SearchPanelData;
  activeNoteId?: string;
}) {
  const t = useMessages();
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const labels = new Map(
    search.folders.map((folder) => [folder.id, folder.label]),
  );
  if (search.failed || !search.query || !search.results.length) {
    return (
      <Empty data-testid={search.failed ? "search-failure" : "search-empty"}>
        <EmptyHeader role={search.failed ? "alert" : "status"}>
          <EmptyMedia variant="icon">
            {search.failed ? <WarningCircleIcon /> : <MagnifyingGlassIcon />}
          </EmptyMedia>
          <EmptyTitle>
            {search.failed
              ? t.search.failed
              : search.query
                ? t.search.empty
                : t.search.start}
          </EmptyTitle>
          <EmptyDescription>
            {search.failed ? t.search.failedBody : t.search.scope}
          </EmptyDescription>
        </EmptyHeader>
        {search.failed && (
          <EmptyContent>
            <Button
              size="sm"
              variant="outline"
              disabled={pending}
              onClick={() => startTransition(() => router.refresh())}
            >
              <ArrowClockwiseIcon data-icon="inline-start" />
              {pending ? t.search.searching : t.library.readRetry}
            </Button>
          </EmptyContent>
        )}
      </Empty>
    );
  }
  return (
    <>
      <p role="status" className="px-1 pt-3 pb-1 text-xs text-muted-foreground">
        {format(t.search.count, { count: search.results.length })}
      </p>
      <ItemGroup aria-label={t.search.results}>
        {search.results.map((note) => {
          const path = note.folderId && labels.get(note.folderId);
          return (
            <div key={note.id} role="listitem">
              <Item
                size="xs"
                variant={activeNoteId === note.id ? "muted" : "default"}
                render={
                  <Link
                    href={`/notes/${note.id}?${new URLSearchParams({ q: search.query })}`}
                    prefetch={false}
                    aria-current={activeNoteId === note.id ? "page" : undefined}
                  />
                }
                data-testid="search-result"
              >
                <ItemContent className="min-w-0">
                  <ItemTitle className="max-w-full">
                    <span className="min-w-0 truncate">
                      <MatchedText
                        text={note.title || untitledTitle(t, note.format)}
                        query={search.query}
                      />
                    </span>
                  </ItemTitle>
                  <div className="flex min-w-0 items-center gap-1.5">
                    <Badge variant="secondary">
                      {formatLabel(t, note.format)}
                    </Badge>
                    <span
                      className="truncate text-xs text-muted-foreground"
                      title={
                        path ? `${t.library.root} / ${path}` : t.library.root
                      }
                    >
                      {path ? `${t.library.root} / ${path}` : t.library.root}
                    </span>
                  </div>
                  <ItemDescription className="wrap-anywhere">
                    <MatchedText text={note.excerpt} query={search.query} />
                  </ItemDescription>
                </ItemContent>
              </Item>
            </div>
          );
        })}
      </ItemGroup>
    </>
  );
}
