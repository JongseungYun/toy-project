"use client";

import { useId, useRef, useState } from "react";
import { TableIcon } from "@phosphor-icons/react";
import { Button } from "@/components/ui/button";
import { Field, FieldGroup, FieldLabel } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { Popover, PopoverContent, PopoverDescription, PopoverHeader, PopoverTitle, PopoverTrigger } from "@/components/ui/popover";
import { useMessages } from "@/components/i18n-provider";
import type { TableAction } from "@/lib/notes/doc-table";

export function TableButton({ inTable, onInsert, onEdit }: {
  inTable: boolean;
  onInsert: (rows: number, columns: number) => void;
  onEdit: (action: TableAction) => void;
}) {
  const t = useMessages().table;
  const [open, setOpen] = useState(false);
  const [rows, setRows] = useState("3");
  const [columns, setColumns] = useState("3");
  const applied = useRef(false);
  const trigger = useRef<HTMLButtonElement>(null);
  const id = useId();
  const valid = Number.isInteger(Number(rows)) && Number(rows) >= 1 && Number(rows) <= 20
    && Number.isInteger(Number(columns)) && Number(columns) >= 1 && Number(columns) <= 10;

  function apply(action: () => void) {
    applied.current = true;
    action();
    setOpen(false);
  }

  return (
    <Popover open={open} onOpenChange={(next) => {
      if (next) applied.current = false;
      setOpen(next);
    }}>
      <PopoverTrigger render={
        <Button ref={trigger} type="button" variant="ghost" size="icon-sm"
          aria-label={t.tools} title={t.tools} onMouseDown={(event) => event.preventDefault()} />
      }>
        <TableIcon />
      </PopoverTrigger>
      <PopoverContent side="top" align="start" role="dialog" aria-label={t.tools}
        aria-labelledby={`${id}-title`}
        className="max-h-[60dvh] overflow-y-auto"
        finalFocus={() => applied.current ? false : trigger.current}>
        <PopoverHeader>
          <PopoverTitle id={`${id}-title`}>{t.tools}</PopoverTitle>
          <PopoverDescription>{inTable ? t.editHint : t.insertHint}</PopoverDescription>
        </PopoverHeader>
        {inTable ? (
          <div className="grid grid-cols-2 gap-2">
            {(["rowBefore", "rowAfter", "columnBefore", "columnAfter", "deleteRow", "deleteColumn", "deleteTable"] as const).map((action) => (
              <Button key={action} type="button" variant={action === "deleteTable" ? "destructive" : "outline"}
                size="sm" className={action === "deleteTable" ? "col-span-2" : undefined}
                onClick={() => apply(() => onEdit(action))}>{t[action]}</Button>
            ))}
          </div>
        ) : (
          <form className="flex flex-col gap-4" onSubmit={(event) => {
            event.preventDefault();
            if (valid) apply(() => onInsert(Number(rows), Number(columns)));
          }}>
            <FieldGroup className="grid grid-cols-2 gap-3">
              <Field>
                <FieldLabel htmlFor={`${id}-rows`}>{t.rows}</FieldLabel>
                <Input id={`${id}-rows`} type="number" min={1} max={20} step={1} required value={rows}
                  onChange={(event) => setRows(event.target.value)} />
              </Field>
              <Field>
                <FieldLabel htmlFor={`${id}-columns`}>{t.columns}</FieldLabel>
                <Input id={`${id}-columns`} type="number" min={1} max={10} step={1} required value={columns}
                  onChange={(event) => setColumns(event.target.value)} />
              </Field>
            </FieldGroup>
            <Button type="submit" disabled={!valid}>{t.insert}</Button>
          </form>
        )}
      </PopoverContent>
    </Popover>
  );
}
