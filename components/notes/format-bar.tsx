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
import { useMessages } from "@/components/i18n-provider";

const TOGGLES = [
  { command: "bold", key: "bold", Icon: TextBIcon },
  { command: "italic", key: "italic", Icon: TextItalicIcon },
  { command: "underline", key: "underline", Icon: TextUnderlineIcon },
  { command: "strikeThrough", key: "strike", Icon: TextStrikethroughIcon },
] as const;

const LISTS = [
  { command: "insertUnorderedList", key: "bulletList", Icon: ListBulletsIcon },
  { command: "insertOrderedList", key: "numberList", Icon: ListNumbersIcon },
] as const;

const ALIGNMENTS = [
  { command: "justifyLeft", key: "alignLeft", Icon: TextAlignLeftIcon },
  { command: "justifyCenter", key: "alignCenter", Icon: TextAlignCenterIcon },
  { command: "justifyRight", key: "alignRight", Icon: TextAlignRightIcon },
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

  const t = useMessages();
  const keepSelection = (event: React.MouseEvent) => event.preventDefault();

  return (
    <div
      className="flex flex-wrap items-center gap-1 border-t border-border px-3 py-2"
      role="toolbar"
      aria-label={t.formatBar.toolbar}
    >
      <select
        aria-label={t.formatBar.font}
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
        aria-label={t.formatBar.size}
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

      {TOGGLES.map(({ command, key, Icon }) => (
        <button
          key={command}
          type="button"
          aria-label={t.formatBar[key]}
          className={BUTTON_CLASS}
          onMouseDown={keepSelection}
          onClick={() => run(() => applyCommand(command))}
        >
          <Icon className="size-4" />
        </button>
      ))}

      <input
        type="color"
        aria-label={t.formatBar.color}
        defaultValue="#b3123f"
        className="size-8 cursor-pointer rounded-md border border-border bg-card p-1"
        onMouseDown={(event) => event.stopPropagation()}
        onChange={(event) => run(() => applyCommand("foreColor", event.target.value))}
      />

      <span className="mx-1 h-5 w-px bg-border" />

      {LISTS.map(({ command, key, Icon }) => (
        <button
          key={command}
          type="button"
          aria-label={t.formatBar[key]}
          className={BUTTON_CLASS}
          onMouseDown={keepSelection}
          onClick={() => run(() => applyCommand(command))}
        >
          <Icon className="size-4" />
        </button>
      ))}

      <span className="mx-1 h-5 w-px bg-border" />

      {ALIGNMENTS.map(({ command, key, Icon }) => (
        <button
          key={command}
          type="button"
          aria-label={t.formatBar[key]}
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
