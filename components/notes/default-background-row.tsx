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
import { useMessages } from "@/components/i18n-provider";
import { format } from "@/lib/i18n/messages";

const COLOR_KEYS = ["white", "cream", "green", "blue", "pink"] as const;

/**
 * 설정의 기본 배경. 여기서 고른 배경으로 새 노트가 시작하고,
 * 이미 만든 노트는 그대로 남는다.
 */
export function DefaultBackgroundRow({
  background,
}: {
  background: NoteBackground;
}) {
  const t = useMessages();
  const index = BACKGROUND_COLORS.findIndex(
    (color) => color.value === (background.kind === "color" ? background.value : ""),
  );
  const current =
    background.kind === "color" && index >= 0
      ? t.background[COLOR_KEYS[index]]
      : t.background.uploadedImage;

  return (
    <div className="flex items-center justify-between gap-4">
      <div className="flex flex-col gap-1">
        <p className="text-sm font-medium">{t.background.defaultLabel}</p>
        <p className="text-sm text-muted-foreground">
          {t.background.defaultBody}
        </p>
      </div>

      <div className="flex flex-none items-center gap-2">
        <span
          aria-label={format(t.background.currentDefault, { name: current })}
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
          label={t.background.defaultPick}
          onChange={(next) => setDefaultBackground(next)}
          trigger={<Button variant="outline">{t.background.defaultPick}</Button>}
        />
      </div>
    </div>
  );
}
