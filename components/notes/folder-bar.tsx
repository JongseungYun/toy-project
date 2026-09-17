"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import { FolderPlusIcon, TrashIcon } from "@phosphor-icons/react";
import { createFolder, trashFolder } from "@/lib/notes/folder-actions";
import type { Crumb } from "@/lib/notes/folders";
import { Button } from "@/components/ui/button";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogTrigger,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";

/**
 * 상단 경로와 폴더 도구. 프로토타입이 정한 경로 표시에, 폴더를 만들고 지우는
 * 자리를 오른쪽에 붙였다. 프로토타입에는 그 두 control이 없어서 여기서 정한다.
 */
export function FolderBar({ crumbs }: { crumbs: Crumb[] }) {
  const here = crumbs[crumbs.length - 1];
  const parent = crumbs.length > 1 ? crumbs[crumbs.length - 2] : null;

  const [creating, setCreating] = useState(false);
  const [name, setName] = useState("");
  const [pending, startTransition] = useTransition();

  function submit() {
    const value = name.trim();
    if (!value) return;
    startTransition(async () => {
      await createFolder(value, here.id);
      setName("");
      setCreating(false);
    });
  }

  return (
    <div className="flex items-center gap-1">
      <nav aria-label="폴더 경로" className="flex min-w-0 flex-1 flex-wrap items-center gap-0.5 text-xs">
        {crumbs.map((crumb, index) => {
          const last = index === crumbs.length - 1;
          return (
            <span key={crumb.id ?? "root"} className="flex items-center gap-0.5">
              {index > 0 && <span className="text-muted-foreground">›</span>}
              {last ? (
                <span className="truncate px-1.5 py-0.5 font-semibold">{crumb.name}</span>
              ) : (
                <Link
                  href={crumb.id ? `/?folder=${crumb.id}` : "/"}
                  className="truncate rounded-sm px-1.5 py-0.5 text-muted-foreground hover:bg-sidebar-accent"
                >
                  {crumb.name}
                </Link>
              )}
            </span>
          );
        })}
      </nav>

      <Button
        variant="ghost"
        size="icon-sm"
        aria-label="새 폴더"
        title="새 폴더"
        onClick={() => setCreating(true)}
      >
        <FolderPlusIcon />
      </Button>

      {here.id && (
        <AlertDialog>
          <AlertDialogTrigger
            render={
              <Button
                variant="ghost"
                size="icon-sm"
                aria-label="이 폴더를 휴지통으로"
                title="이 폴더를 휴지통으로"
              >
                <TrashIcon />
              </Button>
            }
          />
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>{here.name} 폴더를 휴지통으로 보낼까요?</AlertDialogTitle>
              <AlertDialogDescription>
                안에 있는 하위 폴더와 노트도 함께 들어갑니다. 휴지통에서 되돌리면 원래
                자리로 돌아옵니다.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>취소</AlertDialogCancel>
              <AlertDialogAction
                onClick={() =>
                  startTransition(async () => {
                    await trashFolder(here.id!, parent?.id ?? null);
                  })
                }
              >
                휴지통으로 보내기
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      )}

      <Dialog open={creating} onOpenChange={setCreating}>
        <DialogContent className="sm:max-w-sm">
          <DialogHeader>
            <DialogTitle>새 폴더</DialogTitle>
          </DialogHeader>
          <Input
            autoFocus
            aria-label="폴더 이름"
            placeholder="폴더 이름"
            value={name}
            onChange={(event) => setName(event.target.value)}
            onKeyDown={(event) => {
              if (event.key === "Enter") submit();
            }}
          />
          <DialogFooter>
            <Button variant="outline" onClick={() => setCreating(false)} disabled={pending}>
              취소
            </Button>
            <Button onClick={submit} disabled={pending || !name.trim()}>
              만들기
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
