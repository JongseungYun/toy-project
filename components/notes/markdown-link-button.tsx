"use client";

import { useId, useRef, useState, type RefObject } from "react";
import { ImageIcon, LinkIcon } from "@phosphor-icons/react";
import { useMessages } from "@/components/i18n-provider";
import { Button } from "@/components/ui/button";
import { Field, FieldLabel } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { Popover, PopoverContent, PopoverHeader, PopoverTitle, PopoverTrigger } from "@/components/ui/popover";
import { markdownLink } from "@/lib/notes/markdown-link";
import { webAddress } from "@/lib/notes/web-address";

export function MarkdownLinkButton({ kind, editor, shortcutTrigger, changeSource }: {
  kind: "link" | "image";
  editor: RefObject<HTMLTextAreaElement | null>;
  shortcutTrigger?: RefObject<HTMLButtonElement | null>;
  changeSource: (value: string) => void;
}) {
  const t = useMessages();
  const id = useId();
  const [range, setRange] = useState<{ start: number; end: number; source: string } | null>(null);
  const [label, setLabel] = useState("");
  const [address, setAddress] = useState("");
  const applied = useRef(false);
  const localTrigger = useRef<HTMLButtonElement>(null);
  const trigger = shortcutTrigger ?? localTrigger;
  const title = kind === "image" ? t.formatBar.image : t.formatBar.link;
  const href = webAddress(address);

  function open(next: boolean) {
    const input = editor.current;
    if (!next || !input) { setRange(null); return; }
    const { selectionStart: start, selectionEnd: end, value: source } = input;
    setRange({ start, end, source });
    setLabel(source.slice(start, end));
    setAddress("");
    applied.current = false;
  }

  function insert() {
    const input = editor.current;
    if (!range || !href || !input) return;
    if (input.value !== range.source) { setRange(null); return; }
    const text = markdownLink(kind, label, href);
    input.focus({ preventScroll: true });
    input.setSelectionRange(range.start, range.end);
    if (!document.execCommand("insertText", false, text)) {
      input.setRangeText(text, range.start, range.end, "end");
      changeSource(input.value);
    }
    applied.current = true;
    setRange(null);
  }

  return (
    <Popover open={range !== null} onOpenChange={open}>
      <PopoverTrigger render={<Button ref={trigger} variant="ghost" size="icon-sm" aria-label={title}
        title={title} aria-keyshortcuts={kind === "link" ? "Control+K Meta+K" : undefined} />}>
        {kind === "image" ? <ImageIcon /> : <LinkIcon />}
      </PopoverTrigger>
      <PopoverContent align="start" aria-labelledby={id} finalFocus={() => applied.current ? editor.current : trigger.current}>
        <PopoverHeader><PopoverTitle id={id}>{title}</PopoverTitle></PopoverHeader>
        <form className="flex flex-col gap-3" onSubmit={event => { event.preventDefault(); insert(); }}>
          <Field><FieldLabel htmlFor={id + "-url"}>URL</FieldLabel>
            <Input id={id + "-url"} type="url" placeholder="https://…" value={address} onChange={event => setAddress(event.target.value)} />
          </Field>
          <Field><FieldLabel htmlFor={id + "-label"}>{kind === "image" ? t.markdown.imageAlt : t.markdown.linkText}</FieldLabel>
            <Input id={id + "-label"} value={label} onChange={event => setLabel(event.target.value)} />
          </Field>
          <Button type="submit" size="sm" disabled={!href}>{t.formatBar.applyColor}</Button>
        </form>
      </PopoverContent>
    </Popover>
  );
}
