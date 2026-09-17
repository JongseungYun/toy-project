"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { saveNote } from "@/lib/notes/actions";
import type { Note, NoteContent } from "@/lib/notes/types";

// docs/decisions/note-safety.md: 간격 자체는 값이 싼 선택이라 바꿔도 된다.
// 바꾸면 안 되는 것은 "사용자가 저장을 의식하지 않는다"는 쪽이다.
const IDLE_DELAY_MS = 2_000;
const MAX_DELAY_MS = 30_000;

export type SaveStatus = "saving" | "saved" | "error";

export interface RemoteNote {
  title: string;
  content: NoteContent;
  version: number;
  updatedAt: string;
}

export interface NoteDraft {
  content: NoteContent;
  preview: string;
}

/**
 * 형식과 무관한 저장 규칙 한 벌. 세 형식이 같은 자동 저장과 같은 충돌 처리를
 * 쓰도록 여기 한 곳에 둔다. 형식마다 다른 것은 "지금 내용이 무엇인지"(readDraft)와
 * "가져온 내용을 어떻게 되돌려 놓는지"(applyRemote)뿐이다.
 */
export function useNoteAutosave({
  note,
  readDraft,
  applyRemote,
}: {
  note: Note;
  readDraft: () => NoteDraft;
  applyRemote: (content: NoteContent) => void;
}) {
  const router = useRouter();

  const [title, setTitleState] = useState(note.title);
  const [status, setStatus] = useState<SaveStatus>("saved");
  const [savedAt, setSavedAt] = useState(note.updatedAt);
  // 저장에 성공할 때마다 하나씩 오른다. 화면에는 쓰지 않고, 저장이 실제로
  // 끝났는지 밖에서 확인할 수 있게 둔다.
  const [savedCount, setSavedCount] = useState(0);
  const [remote, setRemote] = useState<RemoteNote | null>(null);

  const versionRef = useRef(note.version);
  const titleRef = useRef(note.title);
  const idleTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const maxTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  // 저장은 한 번에 하나씩만 보낸다. 겹쳐 보내면 뒤에 보낸 쪽이 낡은 버전을 들고
  // 가서, 혼자 쓰고 있는데도 충돌로 잘못 판정된다.
  const saving = useRef(false);
  const pending = useRef(false);

  const clearTimers = useCallback(() => {
    if (idleTimer.current) clearTimeout(idleTimer.current);
    if (maxTimer.current) clearTimeout(maxTimer.current);
    idleTimer.current = null;
    maxTimer.current = null;
  }, []);

  const save = useCallback(async () => {
    clearTimers();

    // 이미 보내는 중이면 끝난 뒤에 한 번 더 보내도록 표시만 남긴다.
    if (saving.current) {
      pending.current = true;
      return;
    }
    saving.current = true;

    try {
      do {
        pending.current = false;
        const draft = readDraft();
        setStatus("saving");

        const result = await saveNote({
          id: note.id,
          title: titleRef.current,
          content: draft.content,
          preview: draft.preview,
          baseVersion: versionRef.current,
        });

        if (result.status === "conflict") {
          // 내 내용은 편집 영역에, 저장소의 내용은 여기에. 고르기 전에는 둘 다 남는다.
          // 머리말은 마지막으로 저장에 성공했던 표시를 그대로 둔다.
          setRemote(result.latest as RemoteNote);
          setStatus("saved");
          return;
        }

        if (result.status === "error") {
          setStatus("error");
          return;
        }

        versionRef.current = result.version;
        setSavedAt(result.updatedAt);
        setSavedCount((count) => count + 1);
        setStatus("saved");
        // 좌측 목록의 제목·미리보기·정렬 위치를 새 값으로 다시 그린다.
        router.refresh();
        // 보내는 동안 더 쓴 내용이 있으면 새 버전으로 이어서 보낸다.
      } while (pending.current);
    } finally {
      saving.current = false;
    }
  }, [clearTimers, note.id, readDraft, router]);

  const scheduleSave = useCallback(() => {
    if (idleTimer.current) clearTimeout(idleTimer.current);
    idleTimer.current = setTimeout(() => void save(), IDLE_DELAY_MS);
    // 계속 입력해서 유예가 끝없이 밀리더라도 30초에 한 번은 저장한다.
    if (!maxTimer.current) {
      maxTimer.current = setTimeout(() => void save(), MAX_DELAY_MS);
    }
  }, [save]);

  useEffect(() => clearTimers, [clearTimers]);

  const setTitle = useCallback(
    (value: string) => {
      setTitleState(value);
      titleRef.current = value;
      scheduleSave();
    },
    [scheduleSave],
  );

  const takeRemote = useCallback(() => {
    if (!remote) return;
    applyRemote(remote.content);
    setTitleState(remote.title);
    titleRef.current = remote.title;
    versionRef.current = remote.version;
    setSavedAt(remote.updatedAt);
    setStatus("saved");
    setRemote(null);
    router.refresh();
  }, [applyRemote, remote, router]);

  const keepMine = useCallback(() => {
    if (!remote) return;
    // 최신 버전을 기준으로 다시 저장해 내 내용이 이기게 한다.
    versionRef.current = remote.version;
    setRemote(null);
    void save();
  }, [remote, save]);

  return {
    title,
    setTitle,
    status,
    savedAt,
    savedCount,
    remote,
    scheduleSave,
    saveNow: save,
    takeRemote,
    keepMine,
  };
}
