import type { Metadata } from "next";
import Link from "next/link";
import {
  ArrowsDownUpIcon,
  GearIcon,
  NotePencilIcon,
  PlusIcon,
  TrashIcon,
} from "@phosphor-icons/react/ssr";
import { createClient } from "@/lib/supabase/server";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Empty,
  EmptyContent,
  EmptyDescription,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
} from "@/components/ui/empty";

export const metadata: Metadata = {
  title: "내 보관함 — 아무노트",
};

const SORT_ITEMS = [
  { label: "수정일 최신순", value: "updated" },
  { label: "생성일 최신순", value: "created" },
  { label: "제목 가나다순", value: "title" },
];

export default async function LibraryPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const profile = user
    ? (
        await supabase
          .from("profiles")
          .select("username")
          .eq("id", user.id)
          .maybeSingle()
      ).data
    : null;

  const displayName = profile?.username ?? user?.email ?? "";

  return (
    <div className="flex h-svh flex-col bg-muted p-4 sm:p-6">
      <div className="mx-auto grid h-full w-full max-w-5xl grid-cols-1 overflow-hidden rounded-3xl bg-card shadow-md ring-1 ring-foreground/5 sm:grid-cols-[280px_1fr]">
        <aside className="flex min-h-0 flex-col border-b border-sidebar-border bg-sidebar text-sidebar-foreground sm:border-r sm:border-b-0">
          <div className="flex flex-col gap-3 border-b border-sidebar-border p-3">
            <div className="flex items-center gap-2 text-sm font-semibold">
              <NotePencilIcon className="size-4 text-sidebar-primary" />
              아무노트
              <span className="ml-auto truncate text-xs font-medium text-muted-foreground">
                {displayName}
              </span>
            </div>
            <div className="flex items-center gap-2">
              <Select items={SORT_ITEMS} defaultValue="updated">
                <SelectTrigger className="h-8 flex-1 text-xs">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectGroup>
                    {SORT_ITEMS.map((item) => (
                      <SelectItem key={item.value} value={item.value}>
                        {item.label}
                      </SelectItem>
                    ))}
                  </SelectGroup>
                </SelectContent>
              </Select>
              <Button variant="outline" size="icon-sm" aria-label="정렬 순서 뒤집기">
                <ArrowsDownUpIcon />
              </Button>
            </div>
          </div>

          <div className="flex-1 overflow-y-auto p-3">
            <button
              type="button"
              className="flex h-20 w-full flex-col items-center justify-center gap-1.5 rounded-2xl border border-dashed border-sidebar-border text-xs text-muted-foreground transition-colors hover:border-primary hover:bg-sidebar-accent hover:text-primary"
            >
              <PlusIcon className="size-4" />
              새 노트 만들기
            </button>
          </div>

          <div className="flex gap-1 border-t border-sidebar-border p-2">
            <Button variant="ghost" size="sm" className="flex-1 justify-start text-muted-foreground" disabled>
              <TrashIcon data-icon="inline-start" />
              휴지통
            </Button>
            <Button
              variant="ghost"
              size="sm"
              className="flex-1 justify-start text-muted-foreground"
              render={<Link href="/settings" />}
              nativeButton={false}
            >
              <GearIcon data-icon="inline-start" />
              설정
            </Button>
          </div>
        </aside>

        <main className="flex min-h-0 flex-1 items-center justify-center p-6">
          <Empty>
            <EmptyHeader>
              <EmptyMedia variant="icon">
                <PlusIcon />
              </EmptyMedia>
              <EmptyTitle>첫 노트를 만들어 보세요</EmptyTitle>
              <EmptyDescription>
                일반 문서, Markdown, 그림판 중에서 고를 수 있습니다. 쓰는 동안 저장은 알아서 됩니다.
              </EmptyDescription>
            </EmptyHeader>
            <EmptyContent>
              <Button>새 노트 만들기</Button>
            </EmptyContent>
          </Empty>
        </main>
      </div>
    </div>
  );
}
