"use client";

import type { RefObject } from "react";
import { useCallback, useEffect, useId, useRef, useState } from "react";
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
  HighlighterIcon,
  CaretDownIcon,
} from "@phosphor-icons/react";
import {
  DEFAULT_FONT,
  DEFAULT_SIZE,
  FONT_OPTIONS,
  SIZE_OPTIONS,
  applyCommand,
  applyFontSize,
  defaultTextColor,
  readFormatState,
  type FormatState,
  type SelectionColor,
} from "@/lib/notes/rich-text";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Field, FieldGroup, FieldLabel } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { Popover, PopoverContent, PopoverHeader, PopoverTitle, PopoverTrigger } from "@/components/ui/popover";
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useMessages } from "@/components/i18n-provider";
import { clearDocFormatting } from "@/lib/notes/doc-formatting";

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

const IDLE: FormatState = { on: {}, font: DEFAULT_FONT, size: DEFAULT_SIZE, color: { kind: "color", value: "#000000" }, highlight: { kind: "none" } };

function sameRange(a: Range | null, b: Range | null): boolean {
  return Boolean(a && b && a.startContainer === b.startContainer && a.startOffset === b.startOffset
    && a.endContainer === b.endContainer && a.endOffset === b.endOffset);
}

/** 띠는 현재 선택 상태, 선택창 안의 색은 적용 전 후보를 표시한다. */
function ColorButton({ label, value, highlight = false, onColorChange, onReset }: {
  label: string;
  value: SelectionColor;
  highlight?: boolean;
  onColorChange: (color: string) => void;
  onReset: () => void;
}) {
  const t = useMessages();
  const [open, setOpen] = useState(false);
  const [candidate, setCandidate] = useState("#000000");
  const trigger = useRef<HTMLButtonElement>(null);
  const applied = useRef(false);
  const id = useId();
  const current = value.kind === "color" ? value.value : value.kind === "mixed" ? t.formatBar.mixedColors : t.formatBar.noColor;

  function apply(action: () => void) {
    applied.current = true;
    action();
    setOpen(false);
  }

  return (
    <Popover open={open} onOpenChange={(next) => {
      if (next) {
        applied.current = false;
        setCandidate(value.kind === "color" ? value.value.slice(0, 7) : highlight ? "#fff59d" : "#000000");
      }
      setOpen(next);
    }}>
      <PopoverTrigger render={
        <Button ref={trigger} type="button" variant="ghost" size="sm"
          aria-label={label} aria-describedby={`${id}-current`} title={`${label}: ${current}`}
          data-color-state={value.kind} data-color={value.kind === "color" ? value.value : undefined}
          onMouseDown={(event) => event.preventDefault()}
        />
      }>
        <span aria-hidden="true" className="flex flex-col items-center gap-0.5">
          {highlight ? <HighlighterIcon /> : <span>A</span>}
          <span className={cn("h-1 w-5 rounded-sm", value.kind !== "color" && "border border-dashed border-muted-foreground")}
            style={value.kind === "color" ? { backgroundColor: value.value } : undefined} />
        </span>
        {value.kind !== "color" && <span>{current}</span>}
        <CaretDownIcon aria-hidden="true" />
      </PopoverTrigger>
      <span id={`${id}-current`} className="sr-only">{current}</span>
      <PopoverContent side="top" align="start" className="w-64" role="dialog" aria-label={label}
        finalFocus={() => applied.current ? false : trigger.current}>
        <PopoverHeader><PopoverTitle>{label}</PopoverTitle></PopoverHeader>
        <FieldGroup>
          <Field>
            <FieldLabel htmlFor={`${id}-pick`}>{t.formatBar.pickColor}</FieldLabel>
            <Input id={`${id}-pick`} type="color" value={candidate} onChange={(event) => setCandidate(event.target.value)} />
          </Field>
        </FieldGroup>
        <div className="flex flex-wrap justify-end gap-2">
          <Button type="button" variant="outline" size="sm" onClick={() => apply(onReset)}>
            {highlight ? t.formatBar.noColor : t.formatBar.defaultColor}
          </Button>
          <Button type="button" size="sm" onClick={() => apply(() => onColorChange(candidate))}>{t.formatBar.applyColor}</Button>
        </div>
      </PopoverContent>
    </Popover>
  );
}

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
  const [expanded, setExpanded] = useState(false);
  const id = useId();
  const extraClass = expanded ? "contents" : "hidden @lg/note:contents";

  // 고른 자리. 드롭다운을 열면 편집 영역에서 포커스가 떠나므로, 명령을
  // 실행하기 직전에 이 자리를 되돌려 놓는다.
  const picked = useRef<Range | null>(null);
  // 커서에서 정한 다음 글자 배경은 아직 DOM에 없다. 같은 커서에서만 유지한다.
  const typingHighlight = useRef<{ range: Range; value: SelectionColor } | null>(null);

  const readState = useCallback(() => {
    const editor = editorRef.current;
    if (!editor) return IDLE;
    const next = readFormatState(editor);
    const selection = window.getSelection();
    const range = selection?.rangeCount ? selection.getRangeAt(0) : null;
    const pending = typingHighlight.current;
    if (pending && range?.collapsed && sameRange(pending.range, range)) next.highlight = pending.value;
    else typingHighlight.current = null;
    return next;
  }, [editorRef]);

  const sync = useCallback(() => {
    const editor = editorRef.current;
    const selection = window.getSelection();
    if (!editor || !selection || selection.rangeCount === 0) return;
    if (!editor.contains(selection.anchorNode)) return;

    picked.current = selection.getRangeAt(0).cloneRange();
    setState(readState());
  }, [editorRef, readState]);

  useEffect(() => {
    document.addEventListener("selectionchange", sync);
    const editor = editorRef.current;
    const clearTyping = () => { typingHighlight.current = null; };
    editor?.addEventListener("pointerdown", clearTyping);
    editor?.addEventListener("pointerup", sync);
    return () => {
      document.removeEventListener("selectionchange", sync);
      editor?.removeEventListener("pointerdown", clearTyping);
      editor?.removeEventListener("pointerup", sync);
    };
  }, [editorRef, sync]);

  function run(action: () => void, nextHighlight?: SelectionColor) {
    const editor = editorRef.current;
    if (!editor) return;

    editor.focus();
    const range = picked.current;
    if (range) {
      const selection = window.getSelection();
      const current = selection?.rangeCount ? selection.getRangeAt(0) : null;
      // 같은 커서를 불필요하게 다시 만들면 브라우저의 다음 입력 서식이 풀린다.
      if (!sameRange(current, range)) {
        selection?.removeAllRanges();
        selection?.addRange(range);
      }
    }

    action();
    onChange();
    const selection = window.getSelection();
    const current = selection?.rangeCount ? selection.getRangeAt(0) : null;
    if (current) picked.current = current.cloneRange();
    if (nextHighlight && current?.collapsed) {
      typingHighlight.current = { range: current.cloneRange(), value: nextHighlight };
    }
    setState(readState());
  }

  return (
    <div
      className="flex max-h-[40%] shrink-0 flex-wrap items-center gap-1 overflow-y-auto border-t border-border px-3 py-2"
      role="toolbar"
      aria-label={t.formatBar.toolbar}
    >
      <div id={`${id}-font`} className={extraClass}>
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
      </div>

      {TOGGLES.map(({ command, key, Icon }) => (
        <div key={command} id={key === "strike" ? `${id}-strike` : undefined} className={key === "strike" ? extraClass : "contents"}>
          <ToggleButton
            label={t.formatBar[key]}
            active={state.on[command] ?? false}
            Icon={Icon}
            onRun={() => run(() => applyCommand(command))}
          />
        </div>
      ))}

      <div id={`${id}-color`} className={extraClass}>
        <ColorButton
          label={t.formatBar.color}
          value={state.color}
          onColorChange={(color) => run(() => applyCommand("foreColor", color))}
          onReset={() => run(() => {
            if (editorRef.current) applyCommand("foreColor", defaultTextColor(editorRef.current));
          })}
        />
        <ColorButton
          label={t.formatBar.highlight}
          value={state.highlight}
          highlight
          onColorChange={(color) => run(() => applyCommand("hiliteColor", color), { kind: "color", value: color })}
          onReset={() => run(() => applyCommand("hiliteColor", "transparent"), { kind: "none" })}
        />

        <span className="mx-1 h-5 w-px bg-border" />
      </div>

      {LISTS.map(({ command, key, Icon }) => (
        <ToggleButton
          key={command}
          label={t.formatBar[key]}
          active={state.on[command] ?? false}
          Icon={Icon}
          onRun={() => run(() => applyCommand(command))}
        />
      ))}

      <Button
        type="button"
        variant="ghost"
        size="sm"
        className="ml-auto @lg/note:hidden"
        aria-expanded={expanded}
        aria-controls={`${id}-font ${id}-color ${id}-strike ${id}-other`}
        onMouseDown={(event) => event.preventDefault()}
        onClick={() => setExpanded((value) => !value)}
      >
        {t.formatBar.more}
      </Button>

      <div id={`${id}-other`} className={extraClass}>
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

        <Button
          type="button"
          variant="ghost"
          size="sm"
          title={t.formatBar.clearHint}
          onMouseDown={(event) => event.preventDefault()}
          onClick={() => run(() => {
            if (editorRef.current) clearDocFormatting(editorRef.current);
          })}
        >
          {t.formatBar.clear}
        </Button>
        <span className="text-xs text-muted-foreground">{t.formatBar.plainPaste}</span>
      </div>
    </div>
  );
}
