"use client";

import type { ReactNode } from "react";
import { useCallback, useRef, useState } from "react";
import { previewFromHtml } from "@/lib/notes/display";
import type { DocContent, Note, NoteContent } from "@/lib/notes/types";
import { FormatBar } from "@/components/notes/format-bar";
import { NoteFrame } from "@/components/notes/note-frame";
import { useNoteAutosave } from "@/components/notes/use-note-autosave";

function htmlOf(content: NoteContent): string {
  return (content as DocContent).html ?? "";
}

/**
 * 일반 문서 편집기. 서식은 브라우저의 편집 명령으로 넣고 인라인 style로 저장된다.
 */
export function DocEditor({
  note,
  actions,
}: {
  note: Note;
  /** 폴더·휴지통처럼 형식과 무관한 도구. 머리말 오른쪽에 함께 놓인다. */
  actions?: ReactNode;
}) {
  // 편집 영역은 React가 아니라 브라우저가 내용을 가진다. 처음 한 번만 심고
  // 그 뒤로는 손대지 않아야 새로 그려질 때 쓰던 내용이 날아가지 않는다.
  const [initialHtml] = useState(() => htmlOf(note.content));
  const editorRef = useRef<HTMLDivElement>(null);

  const readDraft = useCallback(() => {
    const html = editorRef.current?.innerHTML ?? "";
    return { content: { html }, preview: previewFromHtml(html) };
  }, []);

  const applyRemote = useCallback((content: NoteContent) => {
    if (editorRef.current) editorRef.current.innerHTML = htmlOf(content);
  }, []);

  const autosave = useNoteAutosave({ note, readDraft, applyRemote });

  return (
    <NoteFrame
      format={note.format}
      title={autosave.title}
      onTitleChange={autosave.setTitle}
      status={autosave.status}
      savedAt={autosave.savedAt}
      savedCount={autosave.savedCount}
      onRetry={() => void autosave.saveNow()}
      remote={autosave.remote}
      onTakeRemote={autosave.takeRemote}
      onKeepMine={autosave.keepMine}
      actions={actions}
    >
      <div className="min-h-0 flex-1 overflow-y-auto bg-muted/40 p-4 sm:p-6">
        <div
          ref={editorRef}
          contentEditable
          suppressContentEditableWarning
          role="textbox"
          aria-multiline="true"
          aria-label="노트 본문"
          data-testid="note-body"
          onInput={autosave.scheduleSave}
          className="prose-note mx-auto min-h-full max-w-3xl rounded-2xl bg-card p-6 text-[15px] leading-7 shadow-sm outline-none ring-1 ring-foreground/5"
          dangerouslySetInnerHTML={{ __html: initialHtml }}
        />
      </div>

      <FormatBar editorRef={editorRef} onChange={autosave.scheduleSave} />
    </NoteFrame>
  );
}
