"use client";

import type { CSSProperties, ReactNode } from "react";
import { useCallback, useRef, useState, useSyncExternalStore } from "react";
import type { Layout } from "react-resizable-panels";
import Markdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { EyeIcon } from "@phosphor-icons/react";
import { cn } from "@/lib/utils";
import { previewFromMarkdown } from "@/lib/notes/display";
import type { MarkdownContent, Note, NoteContent } from "@/lib/notes/types";
import { NoteFrame } from "@/components/notes/note-frame";
import { ExportButton } from "@/components/notes/export-button";
import { useMessages } from "@/components/i18n-provider";
import { useNoteAutosave } from "@/components/notes/use-note-autosave";
import { ResizableHandle, ResizablePanel, ResizablePanelGroup } from "@/components/ui/resizable";

function subscribeToScreenWidth(onChange: () => void) {
  const query = window.matchMedia("(min-width: 640px)");
  query.addEventListener("change", onChange);
  return () => query.removeEventListener("change", onChange);
}

const isWideScreen = () => window.matchMedia("(min-width: 640px)").matches;
const serverWideScreen = () => false;

function read(content: NoteContent): MarkdownContent {
  const markdown = content as MarkdownContent;
  return {
    source: markdown.source ?? "",
    // 처음 열 때는 켜 둔다. 값이 싼 선택이라 더 나은 근거가 나오면 바꿔도 된다.
    viewer: markdown.viewer ?? true,
  };
}

/**
 * Markdown 편집기. 왼쪽에 원문을 쓰고 오른쪽에서 결과를 본다.
 * 뷰어를 켜고 끈 상태는 본문과 함께 노트에 저장되어 다시 열었을 때 그대로다.
 */
export function MarkdownEditor({
  note,
  actions,
  surface,
}: {
  note: Note;
  actions?: ReactNode;
  surface?: CSSProperties;
}) {
  const initial = read(note.content);
  const [source, setSource] = useState(initial.source);
  const [viewer, setViewer] = useState(initial.viewer);
  const wide = useSyncExternalStore(subscribeToScreenWidth, isWideScreen, serverWideScreen);
  const orientation = wide ? "horizontal" : "vertical";
  const [layouts, setLayouts] = useState<Record<string, Layout>>({});

  const sourceRef = useRef(initial.source);
  const viewerRef = useRef(initial.viewer);

  const readDraft = useCallback(
    () => ({
      content: { source: sourceRef.current, viewer: viewerRef.current },
      preview: previewFromMarkdown(sourceRef.current),
    }),
    [],
  );

  const applyRemote = useCallback((content: NoteContent) => {
    const latest = read(content);
    setSource(latest.source);
    sourceRef.current = latest.source;
    setViewer(latest.viewer);
    viewerRef.current = latest.viewer;
  }, []);

  const t = useMessages();
  const autosave = useNoteAutosave({ note, readDraft, applyRemote });

  function changeSource(value: string) {
    setSource(value);
    sourceRef.current = value;
    autosave.scheduleSave();
  }

  function toggleViewer() {
    const next = !viewer;
    setViewer(next);
    viewerRef.current = next;
    // 켜고 끈 것은 한 번의 결정이라 기다리지 않고 바로 남긴다.
    void autosave.saveNow();
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
        <button
          type="button"
          onClick={toggleViewer}
          aria-pressed={viewer}
          aria-label={t.markdown.viewer}
          className={cn(
            "flex flex-none items-center gap-1.5 rounded-md border px-2 py-1 text-xs transition-colors",
            viewer
              ? "border-ring bg-accent text-foreground"
              : "border-border bg-card text-muted-foreground hover:text-foreground",
          )}
        >
          <EyeIcon className="size-4" />
          <span className="hidden @lg/note:inline">{t.markdown.viewer}</span>
        </button>
        <ExportButton format={note.format} title={autosave.title} read={readDraft} />
        {actions}
        </>
      }
    >
      {/* 넓은 화면에서는 좌우로, 좁은 화면에서는 위아래로 나눈다. */}
      <ResizablePanelGroup
        key={`${orientation}-${viewer}`}
        data-testid="md-split"
        orientation={orientation}
        defaultLayout={viewer ? layouts[orientation] : undefined}
        onLayoutChanged={(layout) => {
          if (viewer) setLayouts((current) => ({ ...current, [orientation]: layout }));
        }}
        className="min-h-0 flex-1"
      >
        <ResizablePanel id="markdown-source" defaultSize="50%" minSize="20%">
          <textarea
            style={surface}
            value={source}
            onChange={(event) => changeSource(event.target.value)}
            aria-label={t.markdown.source}
            data-testid="note-body"
            spellCheck={false}
            placeholder={t.markdown.placeholder}
            className="block h-full w-full min-h-0 min-w-0 resize-none bg-card p-5 font-mono text-[13px] leading-7 outline-none"
          />
        </ResizablePanel>
        {viewer && (
          <>
            <ResizableHandle
              withHandle
              aria-label={t.markdown.resize}
              className="w-2 shrink-0 aria-[orientation=horizontal]:h-3"
            />
            <ResizablePanel id="markdown-preview" defaultSize="50%" minSize="20%">
              <div
                data-testid="md-viewer"
                style={surface}
                className="prose-md h-full min-h-0 min-w-0 overflow-y-auto bg-card p-5 text-sm"
              >
                <Markdown remarkPlugins={[remarkGfm]}>{source}</Markdown>
              </div>
            </ResizablePanel>
          </>
        )}
      </ResizablePanelGroup>
    </NoteFrame>
  );
}
