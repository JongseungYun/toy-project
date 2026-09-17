"use client";

import { useState, useTransition } from "react";
import { FolderOpenIcon, TrashIcon } from "@phosphor-icons/react";
import { moveNote, trashNote } from "@/lib/notes/folder-actions";
import { setNoteBackground } from "@/lib/notes/background-actions";
import type { NoteBackground } from "@/lib/notes/background";
import { BackgroundPicker } from "@/components/notes/background-picker";
import { useMessages } from "@/components/i18n-provider";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

/**
 * 노트 머리말의 폴더·휴지통 도구. 프로토타입의 머리말에 있는 휴지통 버튼에,
 * 노트를 다른 폴더로 옮기는 자리를 함께 둔다.
 */
export function NoteActions({
  noteId,
  folderId,
  folders,
  background,
}: {
  noteId: string;
  folderId: string | null;
  folders: { id: string; label: string }[];
  background: NoteBackground;
}) {
  const t = useMessages();
  const [moving, setMoving] = useState(false);
  const [pending, startTransition] = useTransition();

  const places = [
    { id: null as string | null, label: t.library.root },
    ...folders.map((folder) => ({ id: folder.id, label: folder.label })),
  ];

  function move(to: string | null) {
    startTransition(async () => {
      await moveNote(noteId, to);
      setMoving(false);
    });
  }

  return (
    <>
      <BackgroundPicker
        background={background}
        onChange={(next) => setNoteBackground(noteId, next)}
      />

      <Button
        variant="outline"
        size="icon-sm"
        aria-label={t.folder.moveNote}
        title={t.folder.moveNote}
        onClick={() => setMoving(true)}
      >
        <FolderOpenIcon />
      </Button>

      <AlertDialog>
        <AlertDialogTrigger
          render={
            <Button
              variant="outline"
              size="icon-sm"
              aria-label={t.folder.sendToTrash}
              title={t.folder.sendToTrash}
            >
              <TrashIcon />
            </Button>
          }
        />
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{t.trash.trashNoteTitle}</AlertDialogTitle>
            <AlertDialogDescription>
              {t.trash.trashNoteBody}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>{t.trash.cancel}</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => startTransition(async () => void (await trashNote(noteId)))}
            >
              {t.folder.sendToTrash}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <Dialog open={moving} onOpenChange={setMoving}>
        <DialogContent className="sm:max-w-sm">
          <DialogHeader>
            <DialogTitle>{t.folder.moveTitle}</DialogTitle>
            <DialogDescription>
              {t.folder.moveBody}
            </DialogDescription>
          </DialogHeader>
          <div className="flex max-h-72 flex-col gap-1 overflow-y-auto">
            {places.map((place) => {
              const current = place.id === folderId;
              return (
                <button
                  key={place.id ?? "root"}
                  type="button"
                  disabled={pending || current}
                  onClick={() => move(place.id)}
                  className={cn(
                    "rounded-lg px-3 py-2 text-left text-sm transition-colors hover:bg-accent",
                    current && "bg-muted text-muted-foreground",
                  )}
                >
                  {place.label}
                  {current && (
                    <span className="ml-2 text-xs">{t.folder.currentPlace}</span>
                  )}
                </button>
              );
            })}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setMoving(false)} disabled={pending}>
              {t.folder.cancel}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
