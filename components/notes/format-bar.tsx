"use client";

import type { RefObject } from "react";
import { useCallback, useEffect, useRef, useState } from "react";
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
  DEFAULT_FONT,
  DEFAULT_SIZE,
  FONT_OPTIONS,
  SIZE_OPTIONS,
  applyCommand,
  applyFontSize,
  readFormatState,
  type FormatState,
} from "@/lib/notes/rich-text";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
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

const IDLE: FormatState = { on: {}, font: DEFAULT_FONT, size: DEFAULT_SIZE };

/** 누르면 켜고 끄는 서식 하나. 지금 걸려 있으면 눌린 채로 보인다. */
function ToggleButton({
  label,
  active,
  Icon,
  onRun,
}: {
  label: string;
  active: boolean;
  Icon: typeof TextBIcon;
  onRun: () => void;
}) {
  return (
    <Button
      type="button"
      variant="ghost"
      size="icon-sm"
      aria-label={label}
      aria-pressed={active}
      className={cn("text-muted-foreground", active && "bg-accent text-foreground")}
      // 버튼을 누를 때 편집 영역에서 고른 자리를 잃지 않게 한다.
      onMouseDown={(event) => event.preventDefault()}
      onClick={onRun}
    >
      <Icon className="size-4" />
    </Button>
  );
}

/**
 * 편집 영역 아래에 고정된 서식 메뉴. 본문이 길어져도 자리를 지킨다.
 *
 * 메뉴는 고른 글에 이미 걸려 있는 서식을 그대로 비춘다. 굵은 글을 고르면
 * 굵게 버튼이 눌린 채로 보이고, 글꼴과 크기 칸도 그 글의 값을 가리킨다.
 * 그래야 지금 무엇이 걸려 있는지 보고 고칠 수 있다.
 */
export function FormatBar({
  editorRef,
  onChange,
}: {
  editorRef: RefObject<HTMLDivElement | null>;
  onChange: () => void;
}) {
  const t = useMessages();
  const [state, setState] = useState<FormatState>(IDLE);

  // 고른 자리. 드롭다운을 열면 편집 영역에서 포커스가 떠나므로, 명령을
  // 실행하기 직전에 이 자리를 되돌려 놓는다.
  const picked = useRef<Range | null>(null);

  const sync = useCallback(() => {
    const editor = editorRef.current;
    const selection = window.getSelection();
    if (!editor || !selection || selection.rangeCount === 0) return;
    if (!editor.contains(selection.anchorNode)) return;

    picked.current = selection.getRangeAt(0).cloneRange();
    setState(readFormatState(editor));
  }, [editorRef]);

  useEffect(() => {
    document.addEventListener("selectionchange", sync);
    return () => document.removeEventListener("selectionchange", sync);
  }, [sync]);

  function run(action: () => void) {
    const editor = editorRef.current;
    if (!editor) return;

    editor.focus();
    const range = picked.current;
    if (range) {
      const selection = window.getSelection();
      selection?.removeAllRanges();
      selection?.addRange(range);
    }

    action();
    onChange();
    setState(readFormatState(editor));
  }

  return (
    <div
      className="flex flex-wrap items-center gap-1 border-t border-border px-3 py-2"
      role="toolbar"
      aria-label={t.formatBar.toolbar}
    >
      <Select
        items={FONT_OPTIONS.map(({ value, label }) => ({ value, label }))}
        value={state.font}
        onValueChange={(value) =>
          run(() => applyCommand("fontName", String(value)))
        }
      >
        <SelectTrigger size="sm" className="w-32 text-xs" aria-label={t.formatBar.font}>
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          <SelectGroup>
            {/* 이름만으로는 고르기 어렵다. 각 줄을 그 글꼴로 보여 준다. */}
            {FONT_OPTIONS.map((font) => (
              <SelectItem
                key={font.label}
                value={font.value}
                style={{ fontFamily: font.value }}
              >
                {font.label}
              </SelectItem>
            ))}
          </SelectGroup>
        </SelectContent>
      </Select>

      <Select
        items={SIZE_OPTIONS.map((size) => ({ value: size, label: size }))}
        value={state.size}
        onValueChange={(value) =>
          run(() => {
            if (editorRef.current) applyFontSize(editorRef.current, String(value));
          })
        }
      >
        <SelectTrigger size="sm" className="w-18 text-xs" aria-label={t.formatBar.size}>
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          <SelectGroup>
            {SIZE_OPTIONS.map((size) => (
              <SelectItem key={size} value={size}>
                {size}
              </SelectItem>
            ))}
          </SelectGroup>
        </SelectContent>
      </Select>

      <span className="mx-1 h-5 w-px bg-border" />

      {TOGGLES.map(({ command, key, Icon }) => (
        <ToggleButton
          key={command}
          label={t.formatBar[key]}
          active={state.on[command] ?? false}
          Icon={Icon}
          onRun={() => run(() => applyCommand(command))}
        />
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
        <ToggleButton
          key={command}
          label={t.formatBar[key]}
          active={state.on[command] ?? false}
          Icon={Icon}
          onRun={() => run(() => applyCommand(command))}
        />
      ))}

      <span className="mx-1 h-5 w-px bg-border" />

      {ALIGNMENTS.map(({ command, key, Icon }) => (
        <ToggleButton
          key={command}
          label={t.formatBar[key]}
          active={state.on[command] ?? false}
          Icon={Icon}
          onRun={() => run(() => applyCommand(command))}
        />
      ))}
    </div>
  );
}
