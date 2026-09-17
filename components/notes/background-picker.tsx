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
import { useMessages } from "@/components/i18n-provider";

// 팔레트 순서와 같은 이름 키.
const COLOR_KEYS = ["white", "cream", "green", "blue", "pink"] as const;

/**
 * 배경 고르기. 프로토타입의 배경 popover를 그대로 따른다.
 * 노트 머리말과 설정의 기본 배경이 같은 것을 쓴다.
 */
export function BackgroundPicker({
  background,
  onChange,
  trigger,
  label,
}: {
  background: NoteBackground;
  onChange: (next: NoteBackground) => Promise<void> | void;
  trigger?: ReactElement;
  label?: string;
}) {
  const t = useMessages();
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
      setProblem(
        reason === "type" ? t.background.rejectType : t.background.rejectSize,
      );
      return;
    }
    setProblem(null);

    const supabase = createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) {
      setProblem(t.background.sessionLost);
      return;
    }

    // 파일은 항상 내 id 폴더 안에 둔다. 접근 규칙이 이 경로를 보고 판단한다.
    const extension = file.type === "image/png" ? "png" : "jpg";
    const path = `${user.id}/${crypto.randomUUID()}.${extension}`;

    const { error } = await supabase.storage
      .from(BACKGROUND_BUCKET)
      .upload(path, file, { contentType: file.type });

    if (error) {
      setProblem(t.background.uploadFailed);
      return;
    }

    apply({ kind: "image", path });
  }

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger
        render={
          trigger ?? (
            <Button
              variant="outline"
              size="icon-sm"
              aria-label={label ?? t.background.change}
              title={label ?? t.background.change}
            >
              <ImageIcon />
            </Button>
          )
        }
      />
      <PopoverContent className="w-64" align="end">
        <h4 className="mb-2 text-xs font-semibold text-muted-foreground">
          {t.background.colors}
        </h4>
        <div className="mb-3 grid grid-cols-5 gap-1.5">
          {BACKGROUND_COLORS.map((color, index) => {
            const on =
              background.kind === "color" && background.value === color.value;
            return (
              <button
                key={color.value}
                type="button"
                aria-label={t.background[COLOR_KEYS[index]]}
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

        <h4 className="mb-2 text-xs font-semibold text-muted-foreground">
          {t.background.images}
        </h4>
        <input
          ref={fileInput}
          type="file"
          accept={ALLOWED_TYPES.join(",")}
          aria-label={t.background.fileLabel}
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
          {t.background.upload}
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
            {t.background.hint}
          </p>
        )}
      </PopoverContent>
    </Popover>
  );
}
