"use client";

import { useId, useRef, useState } from "react";
import { LinkIcon } from "@phosphor-icons/react";
import { useMessages } from "@/components/i18n-provider";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Field, FieldLabel } from "@/components/ui/field";
import { Popover, PopoverContent, PopoverHeader, PopoverTitle, PopoverTrigger } from "@/components/ui/popover";
import { webAddress } from "@/lib/notes/doc-actions";

export function DocLinkButton({ read, apply }: {
  read: () => string | null;
  apply: (address: string | null) => void;
}) {
  const t = useMessages().formatBar;
  const id = useId();
  const [open, setOpen] = useState(false);
  const [original, setOriginal] = useState<string | null>(null);
  const [value, setValue] = useState("");
  const applied = useRef(false);
  const trigger = useRef<HTMLButtonElement>(null);
  function submit(address: string | null) {
    applied.current = true;
    apply(address);
    setOpen(false);
  }
  return <Popover open={open} onOpenChange={next => {
    if (next) {
      const current = read();
      setOriginal(current);
      setValue(current ?? "");
      applied.current = false;
    }
    setOpen(next);
  }}>
    <PopoverTrigger render={<Button ref={trigger} type="button" variant="ghost" size="icon-sm" title={t.link}
      aria-label={t.link} onMouseDown={event => event.preventDefault()} />}><LinkIcon /></PopoverTrigger>
    <PopoverContent side="top" aria-labelledby={id} finalFocus={() => applied.current ? false : trigger.current}>
      <PopoverHeader><PopoverTitle id={id}>{t.link}</PopoverTitle></PopoverHeader>
      <form className="flex flex-col gap-3" onSubmit={event => { event.preventDefault(); if (webAddress(value)) submit(value); }}>
        <Field><FieldLabel htmlFor={id + "-url"}>URL</FieldLabel>
          <Input id={id + "-url"} type="url" placeholder="https://…" value={value} onChange={event => setValue(event.target.value)} />
        </Field>
        <div className="flex flex-wrap items-center gap-2">
          {original && <><a href={webAddress(original) ?? undefined} target="_blank" rel="noreferrer" className="underline">{t.openLink}</a>
            <Button type="button" variant="outline" size="sm" onClick={() => submit(null)}>{t.removeLink}</Button></>}
          <Button type="submit" size="sm" disabled={!webAddress(value)}>{t.applyColor}</Button>
        </div>
      </form>
    </PopoverContent>
  </Popover>;
}
