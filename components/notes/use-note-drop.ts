"use client";

import { useState, useTransition, type DragEvent } from "react";
import { carriesNote, noteIdFrom } from "@/lib/notes/drag";
import { moveNote } from "@/lib/notes/folder-actions";

/**
 * 끌고 온 노트를 받는 자리. 폴더 한 줄과 상단 경로의 칸이 같은 것을 쓴다.
 *
 * 받을 수 있는 곳인지는 dragover에서 기본 동작을 막아야 브라우저가 알아본다.
 * 막지 않으면 놓아도 아무 일이 일어나지 않는다.
 */
export function useNoteDrop(to: string | null) {
  const [over, setOver] = useState(false);
  const [pending, startTransition] = useTransition();

  return {
    /** 지금 이 자리 위에 노트가 떠 있는가. 화면이 받을 수 있다고 알린다. */
    over,
    pending,
    dropProps: {
      onDragOver(event: DragEvent) {
        if (!carriesNote(event.dataTransfer)) return;
        event.preventDefault();
        event.dataTransfer.dropEffect = "move";
        setOver(true);
      },
      onDragLeave() {
        setOver(false);
      },
      onDrop(event: DragEvent) {
        setOver(false);
        const noteId = noteIdFrom(event.dataTransfer);
        if (!noteId) return;

        // 놓은 자리가 링크라 기본 동작을 두면 그 링크로 따라간다.
        event.preventDefault();
        startTransition(async () => {
          await moveNote(noteId, to);
        });
      },
    },
  };
}
