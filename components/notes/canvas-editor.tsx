"use client";

import type { CSSProperties, ReactNode } from "react";
import { useCallback, useRef, useState } from "react";
import { ArrowCounterClockwiseIcon } from "@phosphor-icons/react";
import {
  CANVAS_HEIGHT,
  CANVAS_WIDTH,
  STROKE_COLORS,
  parseCanvasElements,
  previewFromCanvas,
  type CanvasElement,
  type CanvasTool,
  type ShapeKind,
} from "@/lib/notes/canvas";
import type { CanvasContent, Note, NoteContent } from "@/lib/notes/types";
import { CanvasShape } from "@/components/notes/canvas-figure";
import { DrawBar } from "@/components/notes/draw-bar";
import { NoteFrame } from "@/components/notes/note-frame";
import { useMessages } from "@/components/i18n-provider";
import { useNoteAutosave } from "@/components/notes/use-note-autosave";

const SHAPE_TOOLS: ShapeKind[] = ["rect", "ellipse", "line", "arrow"];
const TEXT_SIZE = 17;

function newId() {
  return `${Date.now().toString(36)}${Math.random().toString(36).slice(2, 7)}`;
}

function elementsOf(content: NoteContent): CanvasElement[] {
  return parseCanvasElements((content as CanvasContent).elements);
}

interface Draft {
  element: CanvasElement;
}

/**
 * 그림판 편집기. 그린 것은 요소 하나하나로 남아서 되돌리기가 요소 단위로
 * 동작하고, 다시 열어 이어 그릴 수 있다.
 */
export function CanvasEditor({
  note,
  actions,
  surface,
}: {
  note: Note;
  actions?: ReactNode;
  surface?: CSSProperties;
}) {
  const [elements, setElements] = useState(() => elementsOf(note.content));
  const [draft, setDraft] = useState<Draft | null>(null);
  const [tool, setTool] = useState<CanvasTool>("pen");
  const [width, setWidth] = useState(2);
  const [color, setColor] = useState<string>(STROKE_COLORS[0].value);
  const [typing, setTyping] = useState<{ x: number; y: number } | null>(null);

  const svgRef = useRef<SVGSVGElement>(null);
  const elementsRef = useRef(elements);

  const commit = useCallback((next: CanvasElement[]) => {
    elementsRef.current = next;
    setElements(next);
  }, []);

  const readDraft = useCallback(
    () => ({
      content: { elements: elementsRef.current },
      preview: previewFromCanvas(elementsRef.current),
    }),
    [],
  );

  const applyRemote = useCallback(
    (content: NoteContent) => commit(elementsOf(content)),
    [commit],
  );

  const t = useMessages();
  const autosave = useNoteAutosave({ note, readDraft, applyRemote });

  /** 화면 좌표를 그림면 좌표로 옮긴다. 그림면은 스크롤될 수 있다. */
  function pointOf(event: React.PointerEvent): { x: number; y: number } {
    const box = svgRef.current!.getBoundingClientRect();
    return {
      x: Math.round(event.clientX - box.left),
      y: Math.round(event.clientY - box.top),
    };
  }

  function startDrawing(event: React.PointerEvent<SVGSVGElement>) {
    if (tool === "eraser") return;
    const { x, y } = pointOf(event);

    // 글상자는 누른 자리에 입력칸을 띄운다. 뗀 뒤에 띄워야 뒤따라오는 click이
    // 갓 열린 입력칸의 포커스를 도로 가져가지 않는다.
    if (tool === "text") return;

    event.currentTarget.setPointerCapture(event.pointerId);

    if (tool === "pen") {
      setDraft({
        element: { id: newId(), kind: "pen", points: [x, y], color, width },
      });
      return;
    }

    setDraft({
      element: {
        id: newId(),
        kind: tool as ShapeKind,
        x1: x,
        y1: y,
        x2: x,
        y2: y,
        color,
        width,
      },
    });
  }

  function keepDrawing(event: React.PointerEvent<SVGSVGElement>) {
    if (!draft) return;
    const { x, y } = pointOf(event);

    setDraft((current) => {
      if (!current) return current;
      const { element } = current;
      if (element.kind === "pen") {
        return { element: { ...element, points: [...element.points, x, y] } };
      }
      if (element.kind === "text") return current;
      return { element: { ...element, x2: x, y2: y } };
    });
  }

  function finishDrawing(event: React.PointerEvent<SVGSVGElement>) {
    if (tool === "text") {
      setTyping(pointOf(event));
      return;
    }

    if (!draft) return;
    const { element } = draft;
    setDraft(null);

    // 누르기만 하고 끌지 않은 도형은 남기지 않는다.
    if (element.kind === "pen" && element.points.length < 4) return;
    if (
      SHAPE_TOOLS.includes(element.kind as ShapeKind) &&
      "x1" in element &&
      element.x1 === element.x2 &&
      element.y1 === element.y2
    ) {
      return;
    }

    commit([...elementsRef.current, element]);
    autosave.scheduleSave();
  }

  function addText(text: string) {
    const place = typing;
    setTyping(null);
    if (!place || !text.trim()) return;

    commit([
      ...elementsRef.current,
      {
        id: newId(),
        kind: "text",
        x: place.x,
        y: place.y,
        text: text.trim(),
        color,
        size: TEXT_SIZE,
      },
    ]);
    autosave.scheduleSave();
  }

  function erase(id: string) {
    if (tool !== "eraser") return;
    commit(elementsRef.current.filter((element) => element.id !== id));
    autosave.scheduleSave();
  }

  function undo() {
    if (elementsRef.current.length === 0) return;
    commit(elementsRef.current.slice(0, -1));
    autosave.scheduleSave();
  }

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
      actions={
        <>
        <button
          type="button"
          onClick={undo}
          aria-label={t.draw.undo}
          disabled={elements.length === 0}
          className="flex size-8 flex-none items-center justify-center rounded-md border border-border bg-card text-muted-foreground transition-colors hover:text-foreground disabled:opacity-40"
        >
          <ArrowCounterClockwiseIcon className="size-4" />
        </button>
        {actions}
        </>
      }
    >
      <div className="relative flex min-h-0 flex-1 justify-start overflow-auto bg-muted p-5">
        <div className="relative">
          <svg
            ref={svgRef}
            data-testid="note-body"
            role="img"
            aria-label={t.draw.surface}
            width={CANVAS_WIDTH}
            height={CANVAS_HEIGHT}
            viewBox={`0 0 ${CANVAS_WIDTH} ${CANVAS_HEIGHT}`}
            onPointerDown={startDrawing}
            onPointerMove={keepDrawing}
            onPointerUp={finishDrawing}
            onPointerCancel={finishDrawing}
            className="touch-none rounded-md border border-border bg-[#fffdf8] shadow-sm"
            style={{ ...surface, cursor: tool === "eraser" ? "pointer" : "crosshair" }}
          >
            {elements.map((element) => (
              <g key={element.id} data-testid="canvas-element" data-kind={element.kind}>
                <CanvasShape element={element} />
                {tool === "eraser" && (
                  // 눈에 보이지 않지만 집기 쉬운 겹침. 지우개일 때만 깐다.
                  <g
                    onPointerDown={() => erase(element.id)}
                    style={{ pointerEvents: "all", cursor: "pointer" }}
                  >
                    <CanvasShape element={element} hitArea />
                  </g>
                )}
              </g>
            ))}
            {draft && <CanvasShape element={draft.element} />}
          </svg>

          {typing && (
            <input
              autoFocus
              aria-label={t.draw.textBoxLabel}
              placeholder={t.draw.textBoxPlaceholder}
              style={{ left: typing.x, top: typing.y - TEXT_SIZE, color }}
              className="absolute min-w-40 rounded-sm border border-ring bg-card px-1 py-0.5 text-[17px] outline-none"
              onKeyDown={(event) => {
                if (event.key === "Enter") addText(event.currentTarget.value);
                if (event.key === "Escape") setTyping(null);
              }}
              onBlur={(event) => addText(event.currentTarget.value)}
            />
          )}
        </div>
      </div>

      <DrawBar
        tool={tool}
        onToolChange={setTool}
        width={width}
        onWidthChange={setWidth}
        color={color}
        onColorChange={setColor}
      />
    </NoteFrame>
  );
}
