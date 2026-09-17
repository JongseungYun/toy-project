"use client";

import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { ArrowDownIcon, ArrowUpIcon } from "@phosphor-icons/react";
import { SORT_OPTIONS, toggleDirection, type ResolvedSort } from "@/lib/notes/sort";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

/**
 * 정렬 기준과 방향. 고른 값을 주소에 담아 서버가 순서를 정하게 한다.
 * 그래야 새로고침해도 순서가 유지되고 목록을 클라이언트에서 다시 정렬하지 않는다.
 */
export function SortControls({ sort }: { sort: ResolvedSort }) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  function changeKey(key: string) {
    const params = new URLSearchParams(searchParams.toString());
    params.set("sort", key);
    // 기준을 바꾸면 방향도 그 기준의 기본값으로 되돌린다. 날짜의 "최신순"을
    // 제목에 그대로 물려주면 "가나다순"이 역순으로 나온다.
    params.delete("dir");
    router.push(`${pathname}?${params.toString()}`);
  }

  function changeDirection(dir: string) {
    const params = new URLSearchParams(searchParams.toString());
    params.set("sort", sort.key);
    params.set("dir", dir);
    router.push(`${pathname}?${params.toString()}`);
  }

  const current = SORT_OPTIONS.find((option) => option.value === sort.key)!;

  return (
    <div className="flex items-center gap-2">
      <Select
        items={SORT_OPTIONS.map(({ value, label }) => ({ value, label }))}
        value={sort.key}
        onValueChange={(value) => changeKey(String(value))}
      >
        <SelectTrigger className="h-8 flex-1 text-xs" aria-label="정렬 기준">
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          <SelectGroup>
            {SORT_OPTIONS.map((option) => (
              <SelectItem key={option.value} value={option.value}>
                {option.label}
              </SelectItem>
            ))}
          </SelectGroup>
        </SelectContent>
      </Select>
      <Button
        variant="outline"
        size="icon-sm"
        aria-label="정렬 순서 뒤집기"
        title={`${current.label} · ${sort.ascending ? "오름차순" : "내림차순"}`}
        onClick={() => changeDirection(toggleDirection(sort.ascending))}
      >
        {sort.ascending ? <ArrowUpIcon /> : <ArrowDownIcon />}
      </Button>
    </div>
  );
}
