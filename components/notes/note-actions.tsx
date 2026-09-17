"use client";

import { useState, useTransition } from "react";
import { FolderOpenIcon, TrashIcon } from "@phosphor-icons/react";
import { moveNote, trashNote } from "@/lib/notes/folder-actions";
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

const ROOT = { id: null as string | null, label: "내 노트" };

/**
 * 노트 머리말의 폴더·휴지통 도구. 프로토타입의 머리말에 있는 휴지통 버튼에,
 * 노트를 다른 폴더로 옮기는 자리를 함께 둔다.
 */
export function NoteActions({
  noteId,
  folderId,
  folders,
}: {
  noteId: string;
  folderId: string | null;
  folders: { id: string; label: string }[];
}) {
  const [moving, setMoving] = useState(false);
  const [pending, startTransition] = useTransition();

  const places = [ROOT, ...folders.map((folder) => ({ id: folder.id, label: folder.label }))];

  function move(to: string | null) {
    startTransition(async () => {
      await moveNote(noteId, to);
      setMoving(false);
    });
  }

  return (
    <>
      <Button
        variant="outline"
        size="icon-sm"
        aria-label="폴더로 옮기기"
        title="폴더로 옮기기"
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
              aria-label="휴지통으로 보내기"
              title="휴지통으로 보내기"
            >
              <TrashIcon />
            </Button>
          }
        />
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>이 노트를 휴지통으로 보낼까요?</AlertDialogTitle>
            <AlertDialogDescription>
              휴지통에서 되돌리면 원래 자리로 돌아옵니다.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>취소</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => startTransition(async () => void (await trashNote(noteId)))}
            >
              휴지통으로 보내기
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <Dialog open={moving} onOpenChange={setMoving}>
        <DialogContent className="sm:max-w-sm">
          <DialogHeader>
            <DialogTitle>어느 폴더로 옮길까요?</DialogTitle>
            <DialogDescription>
              폴더를 먼저 만들어 두면 여기에 나옵니다.
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
                  {current && <span className="ml-2 text-xs">지금 자리</span>}
                </button>
              );
            })}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setMoving(false)} disabled={pending}>
              취소
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
