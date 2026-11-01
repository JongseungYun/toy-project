"use client";

import { useEffect, useState } from "react";
import { ClockCounterClockwiseIcon } from "@phosphor-icons/react";
import { useLocale, useMessages } from "@/components/i18n-provider";
import { NoteReader } from "@/components/notes/note-reader";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Alert, AlertDescription } from "@/components/ui/alert";
import {
  Empty,
  EmptyDescription,
  EmptyHeader,
  EmptyTitle,
} from "@/components/ui/empty";
import { Spinner } from "@/components/ui/spinner";
import {
  listNoteRevisions,
  readNoteRevision,
} from "@/lib/notes/revision-actions";
import type {
  NoteRevision,
  RevisionSummary,
  RestoreRevisionResult,
} from "@/lib/notes/revisions";
import { untitledTitle } from "@/lib/notes/display";
import type { NoteFormat } from "@/lib/notes/types";

type Restore = (revisionId: string) => Promise<RestoreRevisionResult["status"]>;

function RevisionHistory({
  noteId,
  format,
  canRestore,
  restore,
  close,
  onBusy,
}: {
  noteId: string;
  format: NoteFormat;
  canRestore: boolean;
  restore: Restore;
  close: () => void;
  onBusy: (busy: boolean) => void;
}) {
  const t = useMessages();
  const locale = useLocale();
  const [list, setList] = useState<RevisionSummary[] | null>(null);
  const [selected, setSelected] = useState("");
  const [detail, setDetail] = useState<NoteRevision | null>(null);
  const [problem, setProblem] = useState("");
  const [listFailed, setListFailed] = useState(false);
  const [detailFailed, setDetailFailed] = useState(false);
  const [reload, setReload] = useState(0);
  const [detailReload, setDetailReload] = useState(0);
  const [confirm, setConfirm] = useState(false);
  const [busy, setBusy] = useState(false);
  const stamp = (value: string) =>
    new Date(value).toLocaleString(locale, {
      dateStyle: "medium",
      timeStyle: "medium",
    });
  const label = (item: RevisionSummary) =>
    `${stamp(item.savedAt)} · ${item.title || untitledTitle(t, format)}`;

  useEffect(() => {
    let active = true;
    void listNoteRevisions(noteId)
      .then((result) => {
        if (!active) return;
        setListFailed(!result.ok);
        if (result.ok) {
          setList(result.data);
          setSelected(result.data[0]?.id ?? "");
        }
      })
      .catch(() => {
        if (active) setListFailed(true);
      });
    return () => {
      active = false;
    };
  }, [noteId, reload]);

  useEffect(() => {
    if (!selected) return;
    let active = true;
    void readNoteRevision(noteId, selected)
      .then((result) => {
        if (!active) return;
        if (!result.ok) setDetailFailed(true);
        else if (!result.data) setProblem(t.revisions.missing);
        else setDetail(result.data);
      })
      .catch(() => {
        if (active) setDetailFailed(true);
      });
    return () => {
      active = false;
    };
  }, [noteId, selected, detailReload, t.revisions.missing]);

  function refreshList() {
    setList(null);
    setSelected("");
    setDetail(null);
    setProblem("");
    setListFailed(false);
    setDetailFailed(false);
    setConfirm(false);
    setReload((value) => value + 1);
  }

  async function performRestore() {
    if (!detail || !canRestore || busy) return;
    setBusy(true);
    onBusy(true);
    setProblem("");
    try {
      const result = await restore(detail.id);
      if (result === "restored" || result === "conflict") close();
      else {
        setConfirm(false);
        setProblem(
          result === "missing"
            ? t.revisions.missing
            : result === "unsaved"
              ? t.revisions.waitSaved
              : t.revisions.restoreFailed,
        );
        if (result === "missing") setDetail(null);
      }
    } finally {
      setBusy(false);
      onBusy(false);
    }
  }

  return (
    <>
      {listFailed ? (
        <Alert variant="destructive">
          <AlertDescription>{t.revisions.loadFailed}</AlertDescription>
          <Button variant="outline" size="sm" onClick={refreshList}>
            {t.revisions.retry}
          </Button>
        </Alert>
      ) : !list ? (
        <p role="status">
          <Spinner className="inline size-4" /> {t.revisions.loading}
        </p>
      ) : list.length === 0 ? (
        <Empty>
          <EmptyHeader>
            <EmptyTitle>{t.revisions.empty}</EmptyTitle>
            <EmptyDescription>{t.revisions.emptyBody}</EmptyDescription>
          </EmptyHeader>
        </Empty>
      ) : (
        <>
          <Select
            value={selected}
            onValueChange={(id) => {
              if (!id || id === selected) return;
              setSelected(id);
              setDetail(null);
              setDetailFailed(false);
              setProblem("");
              setConfirm(false);
            }}
          >
            <SelectTrigger
              aria-label={t.revisions.choose}
              disabled={busy}
              className="w-full min-w-0"
            >
              <SelectValue className="truncate">
                {list.find((item) => item.id === selected)
                  ? label(list.find((item) => item.id === selected)!)
                  : ""}
              </SelectValue>
            </SelectTrigger>
            <SelectContent>
              <SelectGroup>
                {list.map((item) => (
                  <SelectItem key={item.id} value={item.id}>
                    {label(item)}
                  </SelectItem>
                ))}
              </SelectGroup>
            </SelectContent>
          </Select>
          {detailFailed ? (
            <Alert variant="destructive">
              <AlertDescription>{t.revisions.loadFailed}</AlertDescription>
              <Button
                variant="outline"
                size="sm"
                onClick={() => {
                  setDetailFailed(false);
                  setDetailReload((value) => value + 1);
                }}
              >
                {t.revisions.retry}
              </Button>
            </Alert>
          ) : detail ? (
            <div
              data-testid="revision-preview"
              className="min-h-32 max-h-[45dvh] min-w-0 overflow-auto rounded-md border border-border"
            >
              <h3 className="break-words px-5 pt-5 font-semibold">
                {detail.title || untitledTitle(t, format)}
              </h3>
              <NoteReader format={detail.format} content={detail.content} />
            </div>
          ) : !problem ? (
            <p role="status">{t.revisions.loading}</p>
          ) : null}
          {!canRestore && (
            <p role="status" className="text-sm text-muted-foreground">
              {t.revisions.waitSaved}
            </p>
          )}
          {confirm && (
            <Alert>
              <AlertDescription>{t.revisions.confirm}</AlertDescription>
            </Alert>
          )}
        </>
      )}
      {problem && (
        <Alert variant="destructive">
          <AlertDescription>{problem}</AlertDescription>
          {!detail && (
            <Button variant="outline" size="sm" onClick={refreshList}>
              {t.revisions.retry}
            </Button>
          )}
        </Alert>
      )}
      <DialogFooter>
        {confirm ? (
          <Button
            variant="outline"
            disabled={busy}
            onClick={() => setConfirm(false)}
          >
            {t.revisions.cancel}
          </Button>
        ) : (
          <DialogClose render={<Button variant="outline" />}>
            {t.revisions.close}
          </DialogClose>
        )}
        {!!list?.length && (
          <Button
            disabled={!detail || !canRestore || busy}
            onClick={() => (confirm ? void performRestore() : setConfirm(true))}
          >
            {busy && <Spinner data-icon="inline-start" />}
            {busy
              ? t.revisions.restoring
              : confirm
                ? t.revisions.confirmAction
                : t.revisions.restore}
          </Button>
        )}
      </DialogFooter>
    </>
  );
}

export function NoteRevisionButton({
  noteId,
  format,
  canRestore,
  restore,
}: {
  noteId: string;
  format: NoteFormat;
  canRestore: boolean;
  restore: Restore;
}) {
  const t = useMessages();
  const [open, setOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  return (
    <>
      <Button
        variant="ghost"
        size="icon-sm"
        aria-label={t.revisions.title}
        title={t.revisions.title}
        onClick={() => setOpen(true)}
      >
        <ClockCounterClockwiseIcon />
      </Button>
      <Dialog
        open={open}
        onOpenChange={(value) => {
          if (!busy) setOpen(value);
        }}
      >
        <DialogContent
          showCloseButton={false}
          className="max-h-[90dvh] min-w-0 overflow-y-auto sm:max-w-3xl"
        >
          <DialogHeader>
            <DialogTitle>{t.revisions.title}</DialogTitle>
            <DialogDescription>{t.revisions.policy}</DialogDescription>
          </DialogHeader>
          {open && (
            <RevisionHistory
              noteId={noteId}
              format={format}
              canRestore={canRestore}
              restore={restore}
              close={() => setOpen(false)}
              onBusy={setBusy}
            />
          )}
        </DialogContent>
      </Dialog>
    </>
  );
}
