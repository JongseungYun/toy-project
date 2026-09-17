"use client";

import { useTransition } from "react";
import { emptyTrash } from "@/lib/notes/folder-actions";
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
import { useMessages } from "@/components/i18n-provider";
import { format } from "@/lib/i18n/messages";

/** 휴지통을 통째로 비운다. 돌이킬 수 없으므로 확인을 먼저 받는다. */
export function EmptyTrashButton({ count }: { count: number }) {
  const t = useMessages();
  const [pending, startTransition] = useTransition();

  return (
    <AlertDialog>
      <AlertDialogTrigger
        render={
          <Button variant="destructive" size="sm" disabled={pending}>
            {t.trash.emptyTrash}
          </Button>
        }
      />
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>{t.trash.emptyTrashTitle}</AlertDialogTitle>
          <AlertDialogDescription>
            {format(t.trash.emptyTrashBody, { count })}
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel>{t.trash.cancel}</AlertDialogCancel>
          <AlertDialogAction
            onClick={() => startTransition(async () => await emptyTrash())}
          >
            {t.trash.emptyTrash}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
