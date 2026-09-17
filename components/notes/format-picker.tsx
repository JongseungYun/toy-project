"use client";

import { useState, useTransition } from "react";
import { FileTextIcon, MarkdownLogoIcon, PlusIcon } from "@phosphor-icons/react";
import { createNote } from "@/lib/notes/actions";
import type { NoteFormat } from "@/lib/notes/types";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";

// 지금 실제로 만들 수 있는 형식만 창에 올린다.
// 그림판은 태스크 04가 여기에 자기 항목을 더한다.
const CREATABLE_FORMATS: {
  format: NoteFormat;
  label: string;
  description: string;
  icon: typeof FileTextIcon;
}[] = [
  {
    format: "doc",
    label: "일반 문서",
    description: "글꼴과 색을 바꿔 가며 쓰는 보통 노트",
    icon: FileTextIcon,
  },
  {
    format: "markdown",
    label: "Markdown",
    description: "기호로 쓰고 옆에서 결과를 확인",
    icon: MarkdownLogoIcon,
  },
];

function FormatCards({ onPick, pending }: { onPick: (format: NoteFormat) => void; pending: boolean }) {
  return (
    <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
      {CREATABLE_FORMATS.map(({ format, label, description, icon: Icon }) => (
        <button
          key={format}
          type="button"
          disabled={pending}
          onClick={() => onPick(format)}
          className="flex flex-col items-center gap-2 rounded-2xl border border-border bg-card p-4 text-center transition-colors hover:border-primary hover:bg-accent disabled:opacity-60"
        >
          <span className="flex h-16 w-full items-center justify-center rounded-xl bg-muted text-muted-foreground">
            <Icon className="size-7" />
          </span>
          <span className="text-sm font-semibold">{label}</span>
          <span className="text-xs text-muted-foreground">{description}</span>
        </button>
      ))}
    </div>
  );
}

/**
 * 새 노트 만들기. 좌측 패널 맨 위의 빈 카드와 빈 보관함 안내가 같은 창을 연다.
 * variant는 여는 자리만 다르게 하고 창의 내용은 하나로 둔다.
 */
export function FormatPicker({ variant }: { variant: "card" | "button" }) {
  const [open, setOpen] = useState(false);
  const [pending, startTransition] = useTransition();

  function pick(format: NoteFormat) {
    startTransition(async () => {
      await createNote(format);
    });
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger
        render={
          variant === "card" ? (
            <button
              type="button"
              className="flex h-20 w-full flex-col items-center justify-center gap-1.5 rounded-2xl border border-dashed border-sidebar-border bg-sidebar text-xs text-muted-foreground transition-colors hover:border-primary hover:bg-sidebar-accent hover:text-primary"
            >
              <PlusIcon className="size-5" />
              새 노트 만들기
            </button>
          ) : (
            <Button>새 노트 만들기</Button>
          )
        }
      />
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>어떤 형식으로 쓸까요?</DialogTitle>
          <DialogDescription>
            노트마다 따로 고를 수 있습니다. 나중에 형식을 바꿀 수는 없습니다.
          </DialogDescription>
        </DialogHeader>
        <FormatCards onPick={pick} pending={pending} />
        <DialogFooter>
          <Button variant="outline" onClick={() => setOpen(false)} disabled={pending}>
            취소
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
