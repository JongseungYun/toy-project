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

/** 휴지통을 통째로 비운다. 돌이킬 수 없으므로 확인을 먼저 받는다. */
export function EmptyTrashButton({ count }: { count: number }) {
  const [pending, startTransition] = useTransition();

  return (
    <AlertDialog>
      <AlertDialogTrigger
        render={
          <Button variant="destructive" size="sm" disabled={pending}>
            휴지통 비우기
          </Button>
        }
      />
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>휴지통을 비울까요?</AlertDialogTitle>
          <AlertDialogDescription>
            {count}개가 영구히 사라집니다. 돌이킬 수 없습니다.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel>취소</AlertDialogCancel>
          <AlertDialogAction
            onClick={() => startTransition(async () => await emptyTrash())}
          >
            휴지통 비우기
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
