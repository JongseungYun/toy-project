"use client";

import { ImageIcon } from "@phosphor-icons/react";
import { setDefaultBackground } from "@/lib/notes/background-actions";
import {
  BACKGROUND_COLORS,
  type NoteBackground,
} from "@/lib/notes/background";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { BackgroundPicker } from "@/components/notes/background-picker";

/**
 * 설정의 기본 배경. 여기서 고른 배경으로 새 노트가 시작하고,
 * 이미 만든 노트는 그대로 남는다.
 */
export function DefaultBackgroundRow({
  background,
}: {
  background: NoteBackground;
}) {
  const current =
    background.kind === "color"
      ? (BACKGROUND_COLORS.find((color) => color.value === background.value)
          ?.label ?? "색")
      : "올린 이미지";

  return (
    <div className="flex items-center justify-between gap-4">
      <div className="flex flex-col gap-1">
        <p className="text-sm font-medium">새 노트의 배경</p>
        <p className="text-sm text-muted-foreground">
          여기서 고른 배경으로 새 노트가 시작합니다. 이미 만든 노트는 그대로입니다.
        </p>
      </div>

      <div className="flex flex-none items-center gap-2">
        <span
          aria-label={`지금 기본 배경: ${current}`}
          className={cn(
            "size-8 rounded-sm border border-border",
            background.kind === "image" &&
              "flex items-center justify-center bg-muted text-muted-foreground",
          )}
          style={
            background.kind === "color"
              ? { background: background.value }
              : undefined
          }
        >
          {background.kind === "image" && <ImageIcon className="size-4" />}
        </span>
        <BackgroundPicker
          background={background}
          label="기본 배경 고르기"
          onChange={(next) => setDefaultBackground(next)}
          trigger={<Button variant="outline">기본 배경 고르기</Button>}
        />
      </div>
    </div>
  );
}
