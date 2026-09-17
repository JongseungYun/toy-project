"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ArrowLeftIcon, CircleNotchIcon, WarningIcon } from "@phosphor-icons/react";
import { saveNote } from "@/lib/notes/actions";
import { DEFAULT_TITLE, formatUpdatedAt, previewFromHtml } from "@/lib/notes/display";
import type { DocContent, Note } from "@/lib/notes/types";
import { Button } from "@/components/ui/button";
import { FormatBar } from "@/components/notes/format-bar";

// 되돌릴 수 있는 가정(spec.md): 입력이 멈추고 2초 뒤, 계속 쓰는 중이라면 최대 30초마다.
const IDLE_DELAY_MS = 2_000;
const MAX_DELAY_MS = 30_000;

// 노트는 열린 순간 이미 저장된 상태다. 그래서 대기 상태를 따로 두지 않는다.
type SaveStatus = "saving" | "saved" | "error";

interface RemoteNote {
  title: string;
  content: DocContent;
  version: number;
  updatedAt: string;
}

function SaveIndicator({
  status,
  savedAt,
  onRetry,
}: {
  status: SaveStatus;
  savedAt: string;
  onRetry: () => void;
}) {
  if (status === "saving") {
    return (
      <span className="flex items-center gap-1.5 text-xs text-muted-foreground">
        <CircleNotchIcon className="size-3.5 animate-spin" />
        저장 중…
      </span>
    );
  }

  if (status === "error") {
    return (
      <button
        type="button"
        onClick={onRetry}
        className="flex items-center gap-1.5 text-xs font-medium text-destructive"
      >
        <WarningIcon className="size-3.5" />
        저장하지 못했습니다 · 눌러서 다시 시도
      </button>
    );
  }

  return (
    <span className="flex items-center gap-1.5 text-xs text-muted-foreground">
      <span className="size-1.5 rounded-full bg-emerald-500" />
      저장됨 · {formatUpdatedAt(savedAt)}
    </span>
  );
}

/**
 * 일반 문서 편집기. 저장은 사용자가 누르지 않아도 알아서 일어나고,
 * 다른 기기가 먼저 바꿔 두었으면 덮지 않고 어느 쪽을 남길지 묻는다.
 */
export function NoteEditor({ note }: { note: Note }) {
  const router = useRouter();

  // 편집 영역은 React가 아니라 브라우저가 내용을 가진다. 처음 한 번만 심고
  // 그 뒤로는 손대지 않아야 새로 그려질 때 쓰던 내용이 날아가지 않는다.
  const [initialHtml] = useState(() => (note.content as DocContent).html ?? "");
  const [title, setTitle] = useState(note.title);
  const [status, setStatus] = useState<SaveStatus>("saved");
  const [savedAt, setSavedAt] = useState(note.updatedAt);
  const [remote, setRemote] = useState<RemoteNote | null>(null);

  const editorRef = useRef<HTMLDivElement>(null);
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
        const html = editorRef.current?.innerHTML ?? "";
        setStatus("saving");

        const result = await saveNote({
          id: note.id,
          title: titleRef.current,
          content: { html },
          preview: previewFromHtml(html),
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
        setStatus("saved");
        // 좌측 목록의 제목·미리보기·정렬 위치를 새 값으로 다시 그린다.
        router.refresh();
        // 보내는 동안 더 쓴 내용이 있으면 새 버전으로 이어서 보낸다.
      } while (pending.current);
    } finally {
      saving.current = false;
    }
  }, [clearTimers, note.id, router]);

  const scheduleSave = useCallback(() => {
    if (idleTimer.current) clearTimeout(idleTimer.current);
    idleTimer.current = setTimeout(() => void save(), IDLE_DELAY_MS);
    // 계속 입력해서 유예가 끝없이 밀리더라도 30초에 한 번은 저장한다.
    if (!maxTimer.current) {
      maxTimer.current = setTimeout(() => void save(), MAX_DELAY_MS);
    }
  }, [save]);

  useEffect(() => clearTimers, [clearTimers]);

  function changeTitle(value: string) {
    setTitle(value);
    titleRef.current = value;
    scheduleSave();
  }

  function takeRemote() {
    if (!remote) return;
    if (editorRef.current) editorRef.current.innerHTML = remote.content.html ?? "";
    setTitle(remote.title);
    titleRef.current = remote.title;
    versionRef.current = remote.version;
    setSavedAt(remote.updatedAt);
    setStatus("saved");
    setRemote(null);
    router.refresh();
  }

  function keepMine() {
    if (!remote) return;
    // 최신 버전을 기준으로 다시 저장해 내 내용이 이기게 한다.
    versionRef.current = remote.version;
    setRemote(null);
    void save();
  }

  return (
    <>
      <div className="flex items-center gap-2 border-b border-border px-3 py-2">
        <Button
          variant="ghost"
          size="icon-sm"
          className="sm:hidden"
          render={<Link href="/" aria-label="목록으로" />}
          nativeButton={false}
        >
          <ArrowLeftIcon />
        </Button>
        <input
          value={title}
          onChange={(event) => changeTitle(event.target.value)}
          aria-label="노트 제목"
          placeholder={DEFAULT_TITLE[note.format]}
          className="min-w-0 flex-1 rounded-sm border border-transparent bg-transparent px-1.5 py-1 text-[15px] font-semibold outline-none focus:border-border"
        />
        <SaveIndicator status={status} savedAt={savedAt} onRetry={() => void save()} />
      </div>

      {remote && (
        <div
          role="alert"
          className="flex flex-wrap items-center gap-2 border-b border-border bg-muted px-3 py-2 text-sm"
        >
          <span className="min-w-45 flex-1">
            다른 기기에서 이 노트를 고쳤습니다. 어느 쪽을 남길까요?
          </span>
          <Button size="sm" variant="outline" onClick={takeRemote}>
            최신 내용 불러오기
          </Button>
          <Button size="sm" onClick={keepMine}>
            내 내용으로 덮기
          </Button>
        </div>
      )}

      <div className="min-h-0 flex-1 overflow-y-auto bg-muted/40 p-4 sm:p-6">
        <div
          ref={editorRef}
          contentEditable
          suppressContentEditableWarning
          role="textbox"
          aria-multiline="true"
          aria-label="노트 본문"
          data-testid="note-body"
          onInput={scheduleSave}
          className="prose-note mx-auto min-h-full max-w-3xl rounded-2xl bg-card p-6 text-[15px] leading-7 shadow-sm outline-none ring-1 ring-foreground/5"
          dangerouslySetInnerHTML={{ __html: initialHtml }}
        />
      </div>

      <FormatBar editorRef={editorRef} onChange={scheduleSave} />
    </>
  );
}
