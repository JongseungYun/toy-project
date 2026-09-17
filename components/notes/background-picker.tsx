"use client";

import { useRef, useState, useTransition, type ReactElement } from "react";
import { ImageIcon } from "@phosphor-icons/react";
import { cn } from "@/lib/utils";
import { createClient } from "@/lib/supabase/client";
import {
  ALLOWED_TYPES,
  BACKGROUND_BUCKET,
  BACKGROUND_COLORS,
  rejectBackgroundFile,
  type NoteBackground,
} from "@/lib/notes/background";
import { Button } from "@/components/ui/button";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";

/**
 * 배경 고르기. 프로토타입의 배경 popover를 그대로 따른다.
 * 노트 머리말과 설정의 기본 배경이 같은 것을 쓴다.
 */
export function BackgroundPicker({
  background,
  onChange,
  trigger,
  label = "배경 바꾸기",
}: {
  background: NoteBackground;
  onChange: (next: NoteBackground) => Promise<void> | void;
  trigger?: ReactElement;
  label?: string;
}) {
  const [open, setOpen] = useState(false);
  const [problem, setProblem] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();
  const fileInput = useRef<HTMLInputElement>(null);

  function apply(next: NoteBackground) {
    setProblem(null);
    startTransition(async () => {
      await onChange(next);
    });
  }

  async function upload(file: File) {
    // 화면에서 먼저 거른다. 버킷 쪽에도 같은 제한이 걸려 있다.
    const reason = rejectBackgroundFile(file);
    if (reason) {
      setProblem(reason);
      return;
    }
    setProblem(null);

    const supabase = createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) {
      setProblem("로그인이 풀렸습니다. 다시 들어와 주세요.");
      return;
    }

    // 파일은 항상 내 id 폴더 안에 둔다. 접근 규칙이 이 경로를 보고 판단한다.
    const extension = file.type === "image/png" ? "png" : "jpg";
    const path = `${user.id}/${crypto.randomUUID()}.${extension}`;

    const { error } = await supabase.storage
      .from(BACKGROUND_BUCKET)
      .upload(path, file, { contentType: file.type });

    if (error) {
      setProblem("이미지를 올리지 못했습니다. 잠시 후 다시 시도해 주세요.");
      return;
    }

    apply({ kind: "image", path });
  }

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger
        render={
          trigger ?? (
            <Button variant="outline" size="icon-sm" aria-label={label} title={label}>
              <ImageIcon />
            </Button>
          )
        }
      />
      <PopoverContent className="w-64" align="end">
        <h4 className="mb-2 text-xs font-semibold text-muted-foreground">배경 색</h4>
        <div className="mb-3 grid grid-cols-5 gap-1.5">
          {BACKGROUND_COLORS.map((color) => {
            const on =
              background.kind === "color" && background.value === color.value;
            return (
              <button
                key={color.value}
                type="button"
                aria-label={color.label}
                aria-pressed={on}
                disabled={pending}
                onClick={() => apply({ kind: "color", value: color.value })}
                style={{ background: color.value }}
                className={cn(
                  "h-8 rounded-sm border border-border",
                  on && "outline-2 outline-offset-1 outline-ring",
                )}
              />
            );
          })}
        </div>

        <h4 className="mb-2 text-xs font-semibold text-muted-foreground">배경 이미지</h4>
        <input
          ref={fileInput}
          type="file"
          accept={ALLOWED_TYPES.join(",")}
          aria-label="배경 이미지 파일"
          className="hidden"
          onChange={(event) => {
            const file = event.target.files?.[0];
            event.target.value = "";
            if (file) void upload(file);
          }}
        />
        <Button
          variant="outline"
          size="sm"
          className="w-full"
          disabled={pending}
          onClick={() => fileInput.current?.click()}
        >
          <ImageIcon data-icon="inline-start" />
          이미지 올리기
        </Button>

        {problem ? (
          <p
            role="alert"
            data-testid="background-problem"
            className="mt-2 text-xs leading-relaxed text-destructive"
          >
            {problem}
          </p>
        ) : (
          <p className="mt-2 text-xs leading-relaxed text-muted-foreground">
            JPG·PNG, 5MB까지. 내 계정에만 보관됩니다.
          </p>
        )}
      </PopoverContent>
    </Popover>
  );
}
