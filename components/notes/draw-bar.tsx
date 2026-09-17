"use client";

import {
  ArrowRightIcon,
  CircleIcon,
  EraserIcon,
  LineSegmentIcon,
  PencilSimpleIcon,
  RectangleIcon,
  TextTIcon,
} from "@phosphor-icons/react";
import { cn } from "@/lib/utils";
import {
  STROKE_COLORS,
  STROKE_WIDTHS,
  type CanvasTool,
} from "@/lib/notes/canvas";
import { useMessages } from "@/components/i18n-provider";

const TOOLS: { tool: CanvasTool; Icon: typeof PencilSimpleIcon }[] = [
  { tool: "pen", Icon: PencilSimpleIcon },
  { tool: "eraser", Icon: EraserIcon },
  { tool: "rect", Icon: RectangleIcon },
  { tool: "ellipse", Icon: CircleIcon },
  { tool: "line", Icon: LineSegmentIcon },
  { tool: "arrow", Icon: ArrowRightIcon },
  { tool: "text", Icon: TextTIcon },
];

// 굵기와 색의 이름은 사전에서 가져온다. 값은 화면과 무관하다.
const WIDTH_KEYS = ["thin", "normal", "thick", "thickest"] as const;
const COLOR_KEYS = ["black", "red", "blue"] as const;

/** 그림면 아래에 고정된 도구 모음. 도구, 선 굵기, 선 색을 고른다. */
export function DrawBar({
  tool,
  onToolChange,
  width,
  onWidthChange,
  color,
  onColorChange,
}: {
  tool: CanvasTool;
  onToolChange: (tool: CanvasTool) => void;
  width: number;
  onWidthChange: (width: number) => void;
  color: string;
  onColorChange: (color: string) => void;
}) {
  const t = useMessages();

  return (
    <div
      className="flex flex-wrap items-center gap-1 border-t border-border px-3 py-2"
      role="toolbar"
      aria-label={t.draw.toolbar}
    >
      {TOOLS.map(({ tool: candidate, Icon }, index) => (
        <div key={candidate} className="contents">
          {(index === 2 || index === 6) && (
            <span className="mx-1 h-5 w-px bg-border" />
          )}
          <button
            type="button"
            aria-label={t.draw[candidate]}
            aria-pressed={tool === candidate}
            onClick={() => onToolChange(candidate)}
            className={cn(
              "flex size-8 items-center justify-center rounded-md border transition-colors",
              tool === candidate
                ? "border-border bg-accent text-foreground"
                : "border-transparent text-muted-foreground hover:bg-accent hover:text-foreground",
            )}
          >
            <Icon className="size-4" />
          </button>
        </div>
      ))}

      <span className="mx-1 h-5 w-px bg-border" />

      <select
        aria-label={t.draw.strokeWidth}
        value={width}
        onChange={(event) => onWidthChange(Number(event.target.value))}
        className="h-8 rounded-md border border-border bg-card px-2 text-xs text-foreground"
      >
        {STROKE_WIDTHS.map((option, index) => (
          <option key={option.value} value={option.value}>
            {t.draw[WIDTH_KEYS[index]]}
          </option>
        ))}
      </select>

      {STROKE_COLORS.map((option, index) => (
        <button
          key={option.value}
          type="button"
          aria-label={`${t.formatBar.color} ${t.draw[COLOR_KEYS[index]]}`}
          aria-pressed={color === option.value}
          onClick={() => onColorChange(option.value)}
          className={cn(
            "size-8 rounded-md border p-[3px]",
            color === option.value ? "border-ring" : "border-border",
          )}
        >
          <span
            className="block h-full w-full rounded-[3px]"
            style={{ background: option.value }}
          />
        </button>
      ))}
    </div>
  );
}
