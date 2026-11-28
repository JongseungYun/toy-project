"use client";

import type { CSSProperties, ReactNode } from "react";
import { useCallback, useEffect, useRef, useState } from "react";
import { editorRange, rangeElement, toggleTask } from "@/lib/notes/doc-actions";
import { previewFromHtml } from "@/lib/notes/display";
import { applyCommand } from "@/lib/notes/rich-text";
import type { DocContent, Note, NoteContent } from "@/lib/notes/types";
import { FormatBar } from "@/components/notes/format-bar";
import { NoteFrame } from "@/components/notes/note-frame";
import { ExportButton } from "@/components/notes/export-button";
import { useMessages } from "@/components/i18n-provider";
import { useNoteAutosave } from "@/components/notes/use-note-autosave";
import { normalizeDocHtml, plainTextHtml, restoreDocFormatting } from "@/lib/notes/doc-formatting";
import { moveTableCell } from "@/lib/notes/doc-table";
import { clearWhiteHeaderBackgrounds, normalizeTableHeaderHtml } from "@/lib/notes/doc-table-background";
import { useDocTableResize } from "@/components/notes/use-doc-table-resize";
import { IMAGE_TYPES, IMAGE_DOCUMENT_BUDGET, prepareNoteImage, type ImageProblem } from "@/lib/notes/doc-image";

function htmlOf(content: NoteContent): string {
  return normalizeTableHeaderHtml((content as DocContent).html ?? "");
}

/**
 * 일반 문서 편집기. 서식은 브라우저의 편집 명령으로 넣고 인라인 style로 저장된다.
 */
export function DocEditor({
  note,
  actions,
  surface,
}: {
  note: Note;
  /** 폴더·휴지통처럼 형식과 무관한 도구. 머리말 오른쪽에 함께 놓인다. */
  actions?: ReactNode;
  /** 글 쓰는 면에 입힐 배경. */
  surface?: CSSProperties;
}) {
  // 편집 영역은 React가 아니라 브라우저가 내용을 가진다. 처음 한 번만 심고
  // 그 뒤로는 손대지 않아야 새로 그려질 때 쓰던 내용이 날아가지 않는다.
  const [initialHtml] = useState(() => htmlOf(note.content));
  const editorRef = useRef<HTMLDivElement>(null);
  const fileRef = useRef<HTMLInputElement>(null);
  const insertionRange = useRef<Range | null>(null);
  const [imageError, setImageError] = useState<ImageProblem | null>(null);
  const plainPaste = useRef(false);
  const splittingTask = useRef(false);
  useEffect(() => {
    const editor = editorRef.current!;
    const beforeInput = (event: InputEvent) => {
      splittingTask.current = event.inputType === "insertParagraph" &&
        Boolean(rangeElement(editorRange(editor))?.closest("li[data-task]"));
    };
    editor.addEventListener("beforeinput", beforeInput);
    return () => editor.removeEventListener("beforeinput", beforeInput);
  }, []);
  useDocTableResize(editorRef);

  const readDraft = useCallback(() => {
    const html = editorRef.current?.innerHTML ?? "";
    return { content: { html }, preview: previewFromHtml(html) };
  }, []);

  const applyRemote = useCallback((content: NoteContent) => {
    if (editorRef.current) editorRef.current.innerHTML = htmlOf(content);
  }, []);

  const t = useMessages();
  const autosave = useNoteAutosave({ note, readDraft, applyRemote });

  function fits(editor: HTMLElement, html: string) {
    return new TextEncoder().encode(JSON.stringify(editor.innerHTML + html)).length <= IMAGE_DOCUMENT_BUDGET;
  }

  async function insertImage(file: File, range: Range | null) {
    const editor = editorRef.current;
    if (!editor) return;
    setImageError(null);
    const previous = editor.innerHTML;
    try {
      const html = await prepareNoteImage(file);
      if (editorRef.current !== editor) return;
      if (editor.innerHTML !== previous || (range && !editor.contains(range.commonAncestorContainer))) throw new Error("imageRead");
      if (!fits(editor, html)) throw new Error("imageBudget");
      const position = range ?? document.createRange();
      if (!range) {
        position.selectNodeContents(editor);
        position.collapse(false);
      }
      editor.focus();
      const selection = window.getSelection();
      selection?.removeAllRanges();
      selection?.addRange(position);
      if (!document.execCommand("insertHTML", false, html)) throw new Error("imageRead");
      autosave.scheduleSave();
    } catch (error) {
      const key = error instanceof Error ? error.message : "";
      setImageError(key === "imageBudget" || key === "imageType" || key === "imageSize" ? key : "imageRead");
    }
  }

  return (
    <NoteFrame
      noteId={note.id}
      onRestoreRevision={autosave.restoreFromHistory}
      format={note.format}
      title={autosave.title}
      onTitleChange={autosave.setTitle}
      status={autosave.status}
      draftProtected={autosave.draftProtected}
      savedAt={autosave.savedAt}
      savedCount={autosave.savedCount}
      onRetry={() => void autosave.saveNow()}
      remote={autosave.remote}
      onTakeRemote={autosave.takeRemote}
      onKeepMine={autosave.keepMine}
      actions={
        <>
          <ExportButton format={note.format} title={autosave.title} read={readDraft} />
          {actions}
        </>
      }
    >
      <div className="min-h-0 flex-1 overflow-y-auto bg-muted/40 p-4 sm:p-6">
        <div
          ref={editorRef}
          contentEditable
          suppressContentEditableWarning
          role="textbox"
          aria-multiline="true"
          aria-label={t.note.bodyLabel}
          data-testid="note-body"
          id="note-body"
          onInput={() => {
            if (splittingTask.current && editorRef.current) {
              const item = rangeElement(editorRange(editorRef.current))?.closest("li");
              if (item) item.dataset.task = "open";
              splittingTask.current = false;
            }
            if (editorRef.current) clearWhiteHeaderBackgrounds(editorRef.current);
            autosave.scheduleSave();
          }}
          onClick={(event) => {
            const item = event.target instanceof HTMLElement ? event.target.closest("li[data-task]") : null;
            if (!(item instanceof HTMLElement)) return;
            const offset = item.getBoundingClientRect().left - event.clientX;
            if (offset >= 0 && offset <= 24) {
              toggleTask(item);
              autosave.scheduleSave();
            }
          }}
          onKeyDown={(event) => {
            if ((event.ctrlKey || event.metaKey) && event.key === "Enter" && !event.nativeEvent.isComposing) {
              const item = rangeElement(editorRange(event.currentTarget))?.closest("li[data-task]");
              if (item instanceof HTMLElement) {
                event.preventDefault();
                toggleTask(item);
                autosave.scheduleSave();
                return;
              }
            }
            plainPaste.current = (event.ctrlKey || event.metaKey) && event.shiftKey;
            if (event.key === "Tab" && !event.ctrlKey && !event.metaKey && !event.altKey && !event.nativeEvent.isComposing) {
              if (moveTableCell(event.currentTarget, event.shiftKey)) {
                event.preventDefault();
                autosave.scheduleSave();
                return;
              }
              const selection = window.getSelection();
              const range = selection?.rangeCount ? selection.getRangeAt(0) : null;
              const inListItem = (node: Node) => {
                const element = node instanceof Element ? node : node.parentElement;
                const item = element?.closest("li");
                return item && event.currentTarget.contains(item);
              };
              // 목록 안에서만 Tab을 편집 명령으로 쓴다. 일반 문단에서는
              // 브라우저의 다음/이전 컨트롤로 이동하는 동작을 그대로 둔다.
              if (range && inListItem(range.startContainer) && inListItem(range.endContainer)) {
                event.preventDefault();
                applyCommand(event.shiftKey ? "outdent" : "indent");
                autosave.scheduleSave();
                return;
              }
            }
            if (event.ctrlKey || event.metaKey) {
              const key = event.key.toLowerCase();
              if ((key === "z" || key === "y") && restoreDocFormatting(event.currentTarget, key === "y" || event.shiftKey)) {
                event.preventDefault();
                autosave.scheduleSave();
              }
            }
          }}
          onKeyUp={() => { plainPaste.current = false; }}
          onBeforeInput={(event) => {
            const inputType = (event.nativeEvent as InputEvent).inputType;
            if ((inputType === "historyUndo" || inputType === "historyRedo") && restoreDocFormatting(event.currentTarget, inputType === "historyRedo")) {
              event.preventDefault();
              autosave.scheduleSave();
            }
          }}
          onPaste={(event) => {
            event.preventDefault();
            setImageError(null);
            const image = Array.from(event.clipboardData.files).find(file => file.type.startsWith("image/"));
            if (image && !plainPaste.current) {
              void insertImage(image, editorRange(event.currentTarget)?.cloneRange() ?? null);
              return;
            }
            const html = event.clipboardData.getData("text/html");
            const text = event.clipboardData.getData("text/plain");
            const content = html && !plainPaste.current ? normalizeTableHeaderHtml(normalizeDocHtml(html)) : plainTextHtml(text);
            plainPaste.current = false;
            if (!content) return;
            if (content.includes("<img") && !fits(event.currentTarget, content)) {
              setImageError("imageBudget");
              return;
            }
            document.execCommand("insertHTML", false, content);
            clearWhiteHeaderBackgrounds(event.currentTarget);
            autosave.scheduleSave();
          }}
          style={surface}
          className="prose-note doc-list-markers doc-tables min-h-full w-full rounded-2xl bg-card p-6 text-[15px] leading-7 shadow-sm outline-none ring-1 ring-foreground/5"
          dangerouslySetInnerHTML={{ __html: initialHtml }}
        />
      </div>

      {imageError && <p role="alert" className="px-3 py-1 text-sm text-destructive">{t.formatBar[imageError]}</p>}
      <input hidden ref={fileRef} type="file" accept={IMAGE_TYPES.join(",")} onChange={event => {
        const file = event.target.files?.[0];
        event.target.value = "";
        if (file) void insertImage(file, insertionRange.current);
      }} />
      <FormatBar editorRef={editorRef} onChange={autosave.scheduleSave} onChooseImage={range => {
        insertionRange.current = range;
        fileRef.current?.click();
      }} />
    </NoteFrame>
  );
}
