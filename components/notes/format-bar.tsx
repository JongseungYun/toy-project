"use client";

import type { RefObject } from "react";
import {
  ListBulletsIcon,
  ListNumbersIcon,
  TextAlignCenterIcon,
  TextAlignLeftIcon,
  TextAlignRightIcon,
  TextBIcon,
  TextItalicIcon,
  TextStrikethroughIcon,
  TextUnderlineIcon,
} from "@phosphor-icons/react";
import {
  FONT_OPTIONS,
  SIZE_OPTIONS,
  applyCommand,
  applyFontSize,
} from "@/lib/notes/rich-text";

const TOGGLES = [
  { command: "bold", label: "굵게", Icon: TextBIcon },
  { command: "italic", label: "기울임", Icon: TextItalicIcon },
  { command: "underline", label: "밑줄", Icon: TextUnderlineIcon },
  { command: "strikeThrough", label: "취소선", Icon: TextStrikethroughIcon },
] as const;

const LISTS = [
  { command: "insertUnorderedList", label: "글머리 목록", Icon: ListBulletsIcon },
  { command: "insertOrderedList", label: "번호 목록", Icon: ListNumbersIcon },
] as const;

const ALIGNMENTS = [
  { command: "justifyLeft", label: "왼쪽 정렬", Icon: TextAlignLeftIcon },
  { command: "justifyCenter", label: "가운데 정렬", Icon: TextAlignCenterIcon },
  { command: "justifyRight", label: "오른쪽 정렬", Icon: TextAlignRightIcon },
] as const;

const BUTTON_CLASS =
  "flex size-8 items-center justify-center rounded-md text-muted-foreground transition-colors hover:bg-accent hover:text-foreground";

const SELECT_CLASS =
  "h-8 rounded-md border border-border bg-card px-2 text-xs text-foreground";

/**
 * 편집 영역 아래에 고정된 서식 메뉴. 본문이 길어져도 자리를 지킨다.
 * 버튼을 누를 때 편집 영역의 선택 영역을 잃지 않도록 mousedown을 막는다.
 */
export function FormatBar({
  editorRef,
  onChange,
}: {
  editorRef: RefObject<HTMLDivElement | null>;
  onChange: () => void;
}) {
  function run(action: () => void) {
    editorRef.current?.focus();
    action();
    onChange();
  }

  const keepSelection = (event: React.MouseEvent) => event.preventDefault();

  return (
    <div
      className="flex flex-wrap items-center gap-1 border-t border-border px-3 py-2"
      role="toolbar"
      aria-label="서식"
    >
      <select
        aria-label="글꼴"
        defaultValue={FONT_OPTIONS[0].value}
        className={SELECT_CLASS}
        onMouseDown={keepSelection}
        onChange={(event) =>
          run(() => applyCommand("fontName", event.target.value))
        }
      >
        {FONT_OPTIONS.map((font) => (
          <option key={font.label} value={font.value}>
            {font.label}
          </option>
        ))}
      </select>

      <select
        aria-label="글자 크기"
        defaultValue="15"
        className={SELECT_CLASS}
        onMouseDown={keepSelection}
        onChange={(event) =>
          run(() => {
            if (editorRef.current) applyFontSize(editorRef.current, event.target.value);
          })
        }
      >
        {SIZE_OPTIONS.map((size) => (
          <option key={size} value={size}>
            {size}
          </option>
        ))}
      </select>

      <span className="mx-1 h-5 w-px bg-border" />

      {TOGGLES.map(({ command, label, Icon }) => (
        <button
          key={command}
          type="button"
          aria-label={label}
          className={BUTTON_CLASS}
          onMouseDown={keepSelection}
          onClick={() => run(() => applyCommand(command))}
        >
          <Icon className="size-4" />
        </button>
      ))}

      <input
        type="color"
        aria-label="글자 색"
        defaultValue="#b3123f"
        className="size-8 cursor-pointer rounded-md border border-border bg-card p-1"
        onMouseDown={(event) => event.stopPropagation()}
        onChange={(event) => run(() => applyCommand("foreColor", event.target.value))}
      />

      <span className="mx-1 h-5 w-px bg-border" />

      {LISTS.map(({ command, label, Icon }) => (
        <button
          key={command}
          type="button"
          aria-label={label}
          className={BUTTON_CLASS}
          onMouseDown={keepSelection}
          onClick={() => run(() => applyCommand(command))}
        >
          <Icon className="size-4" />
        </button>
      ))}

      <span className="mx-1 h-5 w-px bg-border" />

      {ALIGNMENTS.map(({ command, label, Icon }) => (
        <button
          key={command}
          type="button"
          aria-label={label}
          className={BUTTON_CLASS}
          onMouseDown={keepSelection}
          onClick={() => run(() => applyCommand(command))}
        >
          <Icon className="size-4" />
        </button>
      ))}
    </div>
  );
}
