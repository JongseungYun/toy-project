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

const TOOLS: { tool: CanvasTool; label: string; Icon: typeof PencilSimpleIcon }[] = [
  { tool: "pen", label: "펜", Icon: PencilSimpleIcon },
  { tool: "eraser", label: "지우개", Icon: EraserIcon },
  { tool: "rect", label: "사각형", Icon: RectangleIcon },
  { tool: "ellipse", label: "원", Icon: CircleIcon },
  { tool: "line", label: "선", Icon: LineSegmentIcon },
  { tool: "arrow", label: "화살표", Icon: ArrowRightIcon },
  { tool: "text", label: "글상자", Icon: TextTIcon },
];

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
  return (
    <div
      className="flex flex-wrap items-center gap-1 border-t border-border px-3 py-2"
      role="toolbar"
      aria-label="그리기 도구"
    >
      {TOOLS.map(({ tool: candidate, label, Icon }, index) => (
        <div key={candidate} className="contents">
          {(index === 2 || index === 6) && (
            <span className="mx-1 h-5 w-px bg-border" />
          )}
          <button
            type="button"
            aria-label={label}
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
        aria-label="선 굵기"
        value={width}
        onChange={(event) => onWidthChange(Number(event.target.value))}
        className="h-8 rounded-md border border-border bg-card px-2 text-xs text-foreground"
      >
        {STROKE_WIDTHS.map((option) => (
          <option key={option.value} value={option.value}>
            {option.label}
          </option>
        ))}
      </select>

      {STROKE_COLORS.map((option) => (
        <button
          key={option.value}
          type="button"
          aria-label={`선 색 ${option.label}`}
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
