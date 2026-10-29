"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { saveNote } from "@/lib/notes/actions";
import {
  clearLocalDraft,
  localDraftKey,
  readLocalDraft,
  sameDraftContent,
  writeLocalDraft,
  type LocalNoteDraft,
} from "@/lib/notes/local-draft";
import type { Note, NoteContent } from "@/lib/notes/types";

const IDLE_DELAY_MS = 2_000;
const MAX_DELAY_MS = 30_000;

export type SaveStatus = "pending" | "unprotected" | "saving" | "saved" | "error" | "offline" | "conflict";

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

/** 세 형식이 같은 초안 보호·자동 저장·버전 충돌 처리를 사용한다. */
export function useNoteAutosave({ note, readDraft, applyRemote }: {
  note: Note;
  readDraft: () => NoteDraft;
  applyRemote: (content: NoteContent) => void;
}) {
  const router = useRouter();
  // 서버 목록 갱신으로 props가 바뀌어도 복구는 편집기를 처음 열 때만 한다.
  const [openedNote] = useState(note);
  const draftKey = openedNote.ownerId ? localDraftKey(openedNote.ownerId, openedNote.id) : null;
  const [title, setTitleState] = useState(note.title);
  const [status, setStatus] = useState<SaveStatus>("saved");
  const [savedAt, setSavedAt] = useState(note.updatedAt);
  const [savedCount, setSavedCount] = useState(0);
  const [draftProtected, setDraftProtected] = useState(false);
  const [remote, setRemote] = useState<RemoteNote | null>(null);

  const versionRef = useRef(note.version);
  const titleRef = useRef(note.title);
  const dirty = useRef<LocalNoteDraft | null>(null);
  const protectedDraft = useRef(true);
  const lastStoredId = useRef<string | null>(null);
  const remoteRef = useRef<RemoteNote | null>(null);
  const mounted = useRef(false);
  const idleTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const maxTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const saving = useRef(false);
  const pending = useRef(false);

  const clearTimers = useCallback(() => {
    if (idleTimer.current) clearTimeout(idleTimer.current);
    if (maxTimer.current) clearTimeout(maxTimer.current);
    idleTimer.current = null;
    maxTimer.current = null;
  }, []);

  const persist = useCallback((draft: LocalNoteDraft) => {
    const stored = writeLocalDraft(draftKey, draft);
    protectedDraft.current = stored;
    setDraftProtected(stored);
    if (stored) lastStoredId.current = draft.id;
    return stored;
  }, [draftKey]);

  const capture = useCallback(() => {
    const snapshot: LocalNoteDraft = {
      ...readDraft(),
      id: crypto.randomUUID(),
      format: openedNote.format,
      title: titleRef.current,
      baseVersion: versionRef.current,
    };
    dirty.current = snapshot;
    persist(snapshot);
    return snapshot;
  }, [openedNote.format, persist, readDraft]);

  const unsavedStatus = useCallback((): SaveStatus => {
    if (remoteRef.current) return "conflict";
    if (!navigator.onLine) return "offline";
    return protectedDraft.current ? "pending" : "unprotected";
  }, []);

  const save = useCallback(async (manualRetry = false) => {
    if (!mounted.current) return;
    clearTimers();
    capture();
    if (remoteRef.current || (!navigator.onLine && !manualRetry)) {
      setStatus(unsavedStatus());
      return;
    }
    if (saving.current) {
      pending.current = true;
      return;
    }
    saving.current = true;
    try {
      do {
        clearTimers();
        if (!navigator.onLine && !manualRetry) {
          setStatus("offline");
          return;
        }
        pending.current = false;
        const sent = dirty.current!;
        setStatus("saving");
        const result = await saveNote({
          id: openedNote.id,
          title: sent.title,
          content: sent.content,
          preview: sent.preview,
          baseVersion: sent.baseVersion,
        });
        if (result.status === "conflict") {
          clearTimers();
          remoteRef.current = result.latest;
          setRemote(result.latest);
          setStatus("conflict");
          return;
        }
        if (result.status === "error") {
          clearTimers();
          setStatus(navigator.onLine ? "error" : "offline");
          return;
        }

        versionRef.current = result.version;
        setSavedAt(result.updatedAt);
        setSavedCount((count) => count + 1);
        if (dirty.current?.id === sent.id) {
          dirty.current = null;
          setDraftProtected(false);
          clearLocalDraft(draftKey, lastStoredId.current);
          lastStoredId.current = null;
          setStatus("saved");
        } else if (dirty.current) {
          // 요청 중에 더 쓴 내용은 지우지 않고, 성공한 새 버전에서 이어 저장한다.
          dirty.current = { ...dirty.current, baseVersion: result.version };
          if (readLocalDraft(draftKey)?.id === lastStoredId.current) persist(dirty.current);
          setStatus(unsavedStatus());
        }
        if (mounted.current) router.refresh();
      } while (mounted.current && pending.current && dirty.current);
    } catch {
      // 연결 예외도 초안을 지우지 않는다. 기존 재시도 버튼으로 이어 저장한다.
      clearTimers();
      setStatus(navigator.onLine ? "error" : "offline");
    } finally {
      saving.current = false;
    }
  }, [capture, clearTimers, draftKey, openedNote.id, persist, router, unsavedStatus]);

  const scheduleSave = useCallback(() => {
    capture();
    setStatus(unsavedStatus());
    if (remoteRef.current || !navigator.onLine) {
      clearTimers();
      return;
    }
    if (saving.current) pending.current = true;
    if (idleTimer.current) clearTimeout(idleTimer.current);
    idleTimer.current = setTimeout(() => void save(), IDLE_DELAY_MS);
    if (!maxTimer.current) maxTimer.current = setTimeout(() => void save(), MAX_DELAY_MS);
  }, [capture, clearTimers, save, unsavedStatus]);

  useEffect(() => {
    let active = true;
    mounted.current = true;
    // hydration 후 편집기 DOM/ref가 준비된 상태에서 외부 저장소의 초안을 적용한다.
    queueMicrotask(() => {
      if (!active) return;
      const cached = readLocalDraft(draftKey);
      if (!cached || cached.format !== openedNote.format) return;
      lastStoredId.current = cached.id;
      if (sameDraftContent(cached, openedNote)) {
        clearLocalDraft(draftKey, cached.id);
        lastStoredId.current = null;
        return;
      }
      dirty.current = cached;
      protectedDraft.current = true;
      setDraftProtected(true);
      titleRef.current = cached.title;
      versionRef.current = cached.baseVersion;
      setTitleState(cached.title);
      applyRemote(cached.content);
      if (cached.baseVersion !== openedNote.version) {
        remoteRef.current = openedNote;
        setRemote(openedNote);
        setStatus("conflict");
      } else {
        setStatus(unsavedStatus());
        if (navigator.onLine) idleTimer.current = setTimeout(() => void save(), IDLE_DELAY_MS);
      }
    });
    const warnIfUnprotected = (event: BeforeUnloadEvent) => {
      if (!dirty.current || protectedDraft.current) return;
      event.preventDefault();
      event.returnValue = "";
    };
    window.addEventListener("beforeunload", warnIfUnprotected);
    const connectionChanged = () => {
      if (!dirty.current || remoteRef.current) return;
      clearTimers();
      // 연결 복구는 서버 저장 성공이 아니다. 버튼으로 재시도할 때 버전을 확인한다.
      setStatus(!navigator.onLine ? "offline" : saving.current ? "saving" : "error");
    };
    window.addEventListener("offline", connectionChanged);
    window.addEventListener("online", connectionChanged);
    return () => {
      active = false;
      mounted.current = false;
      clearTimers();
      window.removeEventListener("beforeunload", warnIfUnprotected);
      window.removeEventListener("offline", connectionChanged);
      window.removeEventListener("online", connectionChanged);
      // 초안은 입력 시 이미 보관했다. 해제된 편집기 DOM을 다시 읽지 않는다.
    };
  }, [applyRemote, clearTimers, draftKey, openedNote, save, unsavedStatus]);

  const setTitle = useCallback((value: string) => {
    setTitleState(value);
    titleRef.current = value;
    scheduleSave();
  }, [scheduleSave]);

  const takeRemote = useCallback(() => {
    if (!remote) return;
    clearTimers();
    clearLocalDraft(draftKey, lastStoredId.current);
    lastStoredId.current = null;
    dirty.current = null;
    setDraftProtected(false);
    pending.current = false;
    applyRemote(remote.content);
    setTitleState(remote.title);
    titleRef.current = remote.title;
    versionRef.current = remote.version;
    setSavedAt(remote.updatedAt);
    setStatus("saved");
    remoteRef.current = null;
    setRemote(null);
    router.refresh();
  }, [applyRemote, clearTimers, draftKey, remote, router]);

  const keepMine = useCallback(() => {
    if (!remote) return;
    versionRef.current = remote.version;
    remoteRef.current = null;
    setRemote(null);
    void save(true);
  }, [remote, save]);

  // 브라우저의 연결 감지는 힌트다. 사용자가 누른 재시도는 실제 요청으로 확인한다.
  const saveNow = useCallback(() => save(true), [save]);

  return { title, setTitle, status, savedAt, savedCount, remote, draftProtected,
    scheduleSave, saveNow, takeRemote, keepMine };
}
