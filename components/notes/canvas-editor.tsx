"use client";

import type { CSSProperties, ReactNode } from "react";
import { useCallback, useEffect, useRef, useState } from "react";
import { ArrowClockwiseIcon, ArrowCounterClockwiseIcon } from "@phosphor-icons/react";
import {
  canvasScale,
  canvasSize,
  STROKE_COLORS,
  parseCanvasElements,
  previewFromCanvas,
  translateCanvasElement,
  type CanvasElement,
  type CanvasSize,
  type CanvasTool,
  type ShapeKind,
} from "@/lib/notes/canvas";
import {
  createCanvasHistory,
  recordCanvasChange,
  redoCanvas,
  undoCanvas,
  type CanvasHistory,
} from "@/lib/notes/canvas-history";
import type { CanvasContent, Note, NoteContent } from "@/lib/notes/types";
import { CanvasShape } from "@/components/notes/canvas-figure";
import { DrawBar } from "@/components/notes/draw-bar";
import { NoteFrame } from "@/components/notes/note-frame";
import { ExportButton } from "@/components/notes/export-button";
import { CopySketchButton } from "@/components/notes/copy-sketch-button";
import { useMessages } from "@/components/i18n-provider";
import { useNoteAutosave } from "@/components/notes/use-note-autosave";
import { Button } from "@/components/ui/button";

const SHAPE_TOOLS: ShapeKind[] = ["rect", "ellipse", "line", "arrow"];
const TEXT_SIZE = 17;
const PEN_CURSOR = "url('/cursors/pen.svg') 5 27, crosshair";
const ERASER_CURSOR = "url('/cursors/eraser.svg') 9 26, crosshair";

type Point = { x: number; y: number };
type Selection = Point & CanvasSize & { id: string };

function selectionOf(group: SVGGElement): Selection {
  const { x, y, width, height } = group.getBBox();
  return { id: group.dataset.elementId!, x, y, width, height };
}

function moveOffset(selection: Selection, dx: number, dy: number): Point {
  return {
    x: Math.max(Math.min(0, -Math.floor(selection.x)), Math.round(dx)),
    y: Math.max(Math.min(0, -Math.floor(selection.y)), Math.round(dy)),
  };
}

/** 이벤트 사이의 경로도 훑는다. 도형은 브라우저가 실제로 그린 획으로 판정한다. */
function erasedIdsBetween(svg: SVGSVGElement, from: Point, to: Point): Set<string> {
  const ids = new Set<string>();
  // 집기 위한 획은 최소 16 원본 단위다. 그보다 촘촘히 경로를 확인한다.
  const steps = Math.max(1, Math.ceil(Math.hypot(to.x - from.x, to.y - from.y) / 4));
  for (const group of svg.querySelectorAll<SVGGElement>("[data-eraser-hit]")) {
    for (const part of Array.from(group.children) as SVGGraphicsElement[]) {
      const geometry = part instanceof SVGGeometryElement ? part : null;
      const box = geometry ? null : part.getBBox();
      for (let step = 0; step <= steps; step++) {
        const point = {
          x: from.x + (to.x - from.x) * step / steps,
          y: from.y + (to.y - from.y) * step / steps,
        };
        const hit = geometry
          ? geometry.isPointInStroke(point)
          : box && point.x >= box.x && point.x <= box.x + box.width
            && point.y >= box.y && point.y <= box.y + box.height;
        if (hit) {
          ids.add(group.dataset.eraserHit!);
          break;
        }
      }
      if (ids.has(group.dataset.eraserHit!)) break;
    }
  }
  return ids;
}

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
 * 그림판 편집기. 그린 것은 요소 하나하나로 남아서 되돌리기가 작업 단위로
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
  const [history, setHistory] = useState(() => createCanvasHistory(elementsOf(note.content)));
  const historyRef = useRef(history);
  const elements = history.present;
  const [draft, setDraft] = useState<Draft | null>(null);
  const [tool, setTool] = useState<CanvasTool>("pen");
  const [width, setWidth] = useState(2);
  const [color, setColor] = useState<string>(STROKE_COLORS[0].value);
  const [typing, setTyping] = useState<{ x: number; y: number } | null>(null);
  const erasing = useRef<{ pointerId: number; last: Point; recorded: boolean } | null>(null);
  const [erasePaper, setErasePaper] = useState<CanvasSize | null>(null);
  const [selection, setSelection] = useState<Selection | null>(null);
  const moving = useRef<{ pointerId: number; start: Point; selection: Selection } | null>(null);
  const [offset, setOffset] = useState<Point | null>(null);

  const svgRef = useRef<SVGSVGElement>(null);
  const viewportRef = useRef<HTMLDivElement>(null);
  const [viewport, setViewport] = useState({ width: 0, height: 0 });

  useEffect(() => {
    const viewport = viewportRef.current;
    if (!viewport) return;
    const observer = new ResizeObserver(([entry]) => {
      setViewport({ width: entry.contentRect.width, height: entry.contentRect.height });
    });
    observer.observe(viewport);
    return () => observer.disconnect();
  }, []);

  const scale = canvasScale(viewport);
  const bounds = canvasSize(elements);
  const paper = {
    width: Math.max(bounds.width, erasePaper?.width ?? 0, viewport.width / scale),
    height: Math.max(bounds.height, erasePaper?.height ?? 0, viewport.height / scale),
  };

  const applyHistory = useCallback((next: CanvasHistory) => {
    historyRef.current = next;
    setHistory(next);
  }, []);

  // 지우개 드래그의 후속 변경은 첫 삭제 직전의 스냅샷을 함께 사용한다.
  const commit = useCallback((next: CanvasElement[], continuing = false) => {
    const current = historyRef.current;
    applyHistory(continuing ? { ...current, present: next } : recordCanvasChange(current, next));
  }, [applyHistory]);

  const readDraft = useCallback(
    () => ({
      content: { elements: historyRef.current.present },
      preview: previewFromCanvas(historyRef.current.present),
    }),
    [],
  );

  const applyRemote = useCallback(
    (content: NoteContent) => {
      erasing.current = null;
      moving.current = null;
      setSelection(null);
      setOffset(null);
      setErasePaper(null);
      setDraft(null);
      setTyping(null);
      applyHistory(createCanvasHistory(elementsOf(content)));
    },
    [applyHistory],
  );

  const t = useMessages();
  const autosave = useNoteAutosave({ note, readDraft, applyRemote });

  /** 배율과 스크롤을 함께 반영해 포인터를 원본 좌표로 옮긴다. */
  function originalPoint(event: React.PointerEvent): DOMPoint {
    return new DOMPoint(event.clientX, event.clientY)
      .matrixTransform(svgRef.current!.getScreenCTM()!.inverse());
  }

  function pointOf(event: React.PointerEvent): Point {
    const point = originalPoint(event);
    return {
      x: Math.round(Math.max(0, Math.min(paper.width, point.x))),
      y: Math.round(Math.max(0, Math.min(paper.height, point.y))),
    };
  }

  function startDrawing(event: React.PointerEvent<SVGSVGElement>) {
    if (event.button !== 0) return;
    event.currentTarget.focus({ preventScroll: true });
    if (tool === "select") {
      if (moving.current) return;
      const group = (event.target as Element).closest<SVGGElement>("[data-element-id]");
      const selected = group && selectionOf(group);
      setSelection(selected);
      if (selected) {
        moving.current = { pointerId: event.pointerId, start: originalPoint(event), selection: selected };
        setOffset({ x: 0, y: 0 });
        event.currentTarget.setPointerCapture(event.pointerId);
      }
      return;
    }
    if (tool === "eraser") {
      if (erasing.current) return;
      const point = originalPoint(event);
      erasing.current = { pointerId: event.pointerId, last: point, recorded: false };
      // 지운 직후 그림면이 줄면서 스크롤과 포인터 위치가 튀지 않게 한다.
      setErasePaper(paper);
      event.currentTarget.setPointerCapture(event.pointerId);
      eraseBetween(point, point);
      return;
    }
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
    if (tool === "select") {
      const gesture = moving.current;
      if (gesture?.pointerId === event.pointerId) {
        const point = originalPoint(event);
        setOffset(moveOffset(gesture.selection, point.x - gesture.start.x, point.y - gesture.start.y));
      }
      return;
    }
    if (tool === "eraser") {
      const gesture = erasing.current;
      if (!gesture || gesture.pointerId !== event.pointerId) return;
      if (!(event.buttons & 1)) {
        stopErasing();
        return;
      }
      const point = originalPoint(event);
      eraseBetween(gesture.last, point);
      gesture.last = point;
      return;
    }
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
    if (tool === "select") {
      const gesture = moving.current;
      if (gesture?.pointerId !== event.pointerId) return;
      if (event.type === "pointerup") {
        const point = originalPoint(event);
        moveSelection(gesture.selection, moveOffset(gesture.selection, point.x - gesture.start.x, point.y - gesture.start.y));
      }
      stopMoving();
      return;
    }
    if (tool === "eraser") {
      const gesture = erasing.current;
      if (gesture?.pointerId === event.pointerId) {
        if (event.type === "pointerup") eraseBetween(gesture.last, originalPoint(event));
        stopErasing();
      }
      return;
    }
    if (tool === "text") {
      if (event.type !== "pointerup") return;
      setTyping(pointOf(event));
      return;
    }

    if (!draft) return;
    const { element } = draft;
    setDraft(null);
    if (event.type !== "pointerup") return;

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

    commit([...historyRef.current.present, element]);
    autosave.scheduleSave();
  }

  function addText(text: string) {
    const place = typing;
    setTyping(null);
    if (!place || !text.trim()) return;

    commit([
      ...historyRef.current.present,
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

  function eraseBetween(from: Point, to: Point) {
    const ids = erasedIdsBetween(svgRef.current!, from, to);
    const current = historyRef.current.present;
    const next = current.filter((element) => !ids.has(element.id));
    const gesture = erasing.current;
    if (!gesture || next.length === current.length) return;
    commit(next, gesture.recorded);
    gesture.recorded = true;
    autosave.scheduleSave();
  }

  function stopErasing() {
    erasing.current = null;
    setErasePaper(null);
  }

  function stopMoving() {
    moving.current = null;
    setOffset(null);
  }

  function moveSelection(selected: Selection, delta: Point) {
    if (!delta.x && !delta.y) return;
    const next = historyRef.current.present.map((element) => element.id === selected.id
      ? translateCanvasElement(element, delta.x, delta.y) : element);
    commit(next);
    setSelection({ ...selected, x: selected.x + delta.x, y: selected.y + delta.y });
    autosave.scheduleSave();
  }

  function selectionKey(event: React.KeyboardEvent<SVGSVGElement>) {
    if (tool !== "select" || !selection) return;
    if (event.key === "Escape") {
      stopMoving();
      setSelection(null);
      event.currentTarget.focus();
      event.preventDefault();
      return;
    }
    if (moving.current || event.metaKey || event.ctrlKey || event.altKey) return;
    const step = event.shiftKey ? 10 : 1;
    const arrows: Record<string, Point> = {
      ArrowLeft: { x: -step, y: 0 }, ArrowRight: { x: step, y: 0 },
      ArrowUp: { x: 0, y: -step }, ArrowDown: { x: 0, y: step },
    };
    const delta = arrows[event.key];
    if (delta) {
      event.preventDefault();
      moveSelection(selection, moveOffset(selection, delta.x, delta.y));
    }
  }

  function stepHistory(redo: boolean) {
    if (draft || erasing.current || moving.current || typing) return;
    const current = historyRef.current;
    const next = redo ? redoCanvas(current) : undoCanvas(current);
    if (next === current) return;
    setSelection(null);
    applyHistory(next);
    autosave.scheduleSave();
  }

  function historyKey(event: React.KeyboardEvent<HTMLDivElement>) {
    if (event.defaultPrevented || event.nativeEvent.isComposing || event.altKey || !(event.ctrlKey || event.metaKey)) return;
    const target = event.target as Element;
    // 제목·글상자의 글자 편집과 포털로 열린 대화상자는 브라우저에 맡긴다.
    if (!event.currentTarget.contains(target) || target.closest("input, textarea, [contenteditable='true']")) return;
    const key = event.key.toLowerCase();
    const redo = (key === "z" && event.shiftKey) || (key === "y" && event.ctrlKey);
    if (key !== "z" && !(key === "y" && event.ctrlKey)) return;
    if (draft || erasing.current || typing || (redo ? !historyRef.current.future.length : !historyRef.current.past.length)) return;
    event.preventDefault();
    stepHistory(redo);
  }

  const busy = draft !== null || erasePaper !== null || offset !== null || typing !== null;

  return (
    <div className="contents" onKeyDown={historyKey}>
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
          <Button
            type="button"
            variant="outline"
            size="icon-sm"
            onClick={() => stepHistory(false)}
            aria-label={t.draw.undo}
            title={`${t.draw.undo} (Ctrl/⌘+Z)`}
            aria-keyshortcuts="Control+Z Meta+Z"
            disabled={busy || history.past.length === 0}
          >
            <ArrowCounterClockwiseIcon />
          </Button>
          <Button
            type="button"
            variant="outline"
            size="icon-sm"
            onClick={() => stepHistory(true)}
            aria-label={t.draw.redo}
            title={`${t.draw.redo} (Ctrl/⌘+Shift+Z / Ctrl+Y)`}
            aria-keyshortcuts="Control+Shift+Z Meta+Shift+Z Control+Y"
            disabled={busy || history.future.length === 0}
          >
            <ArrowClockwiseIcon />
          </Button>
          <ExportButton format={note.format} title={autosave.title} read={readDraft} />
          {actions}
          </>
        }
      >
        <div className="flex min-h-0 flex-1 flex-col bg-muted p-3">
          <div ref={viewportRef} className="relative min-h-0 flex-1" data-testid="canvas-viewport">
            <div className="absolute inset-0 overflow-auto" data-testid="canvas-scroll">
              <div className="relative" style={{ width: paper.width * scale, height: paper.height * scale }}>
                <svg
                  ref={svgRef}
                  data-testid="note-body"
                  role={tool === "select" ? "group" : "img"}
                  tabIndex={0}
                  aria-label={t.draw.surface}
                  width={paper.width * scale}
                  height={paper.height * scale}
                  viewBox={`0 0 ${paper.width} ${paper.height}`}
                  onPointerDown={startDrawing}
                  onPointerMove={keepDrawing}
                  onPointerUp={finishDrawing}
                  onPointerCancel={finishDrawing}
                  onKeyDown={selectionKey}
                  onLostPointerCapture={(event) => {
                    if (moving.current?.pointerId === event.pointerId) stopMoving();
                    stopErasing();
                    setDraft(null);
                  }}
                  className="block max-w-none touch-none select-none rounded-md bg-[#fffdf8] shadow-sm ring-1 ring-border"
                  style={{
                    ...surface,
                    cursor: tool === "select" ? (offset ? "grabbing" : "default") :
                      tool === "eraser" ? ERASER_CURSOR : tool === "pen" ? PEN_CURSOR : "crosshair",
                  }}
                >
                  {elements.map((element, index) => (
                    <g key={element.id} data-testid="canvas-element" data-kind={element.kind}
                      data-element-id={element.id}
                      tabIndex={tool === "select" ? 0 : undefined}
                      aria-label={tool === "select" ? `${t.draw[element.kind]} ${index + 1}` : undefined}
                      onFocus={tool === "select" ? (event) => setSelection(selectionOf(event.currentTarget)) : undefined}
                      transform={selection?.id === element.id && offset ? `translate(${offset.x} ${offset.y})` : undefined}
                      style={tool === "select" ? { cursor: offset ? "grabbing" : "grab" } : undefined}
                    >
                      <CanvasShape element={element} />
                      {tool === "select" && (
                        <g pointerEvents={element.kind === "rect" || element.kind === "ellipse" || element.kind === "text" ? "all" : "stroke"}>
                          <CanvasShape element={element} hitArea />
                        </g>
                      )}
                      {tool === "eraser" && (
                        // 눈에 보이지 않는 굵은 획으로 경로 접촉을 판정한다.
                        <g
                          data-eraser-hit={element.id}
                          style={{ pointerEvents: "none" }}
                        >
                          <CanvasShape element={element} hitArea />
                        </g>
                      )}
                    </g>
                  ))}
                  {selection && (
                    <rect pointerEvents="none" fill="none" stroke="#2563eb" strokeDasharray="5 4"
                      vectorEffect="non-scaling-stroke"
                      x={selection.x + (offset?.x ?? 0) - 4} y={selection.y + (offset?.y ?? 0) - 4}
                      width={selection.width + 8} height={selection.height + 8}
                    />
                  )}
                  {draft && <CanvasShape element={draft.element} />}
                </svg>

                {typing && (
                  <input
                    autoFocus
                    aria-label={t.draw.textBoxLabel}
                    placeholder={t.draw.textBoxPlaceholder}
                    style={{
                      left: typing.x * scale,
                      top: Math.max(0, typing.y - TEXT_SIZE) * scale,
                      transform: `scale(${scale})`,
                      transformOrigin: "top left",
                      color,
                    }}
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
          </div>
        </div>

        <DrawBar
          tool={tool}
          onToolChange={(next) => { stopMoving(); setSelection(null); setTool(next); }}
          width={width}
          onWidthChange={setWidth}
          color={color}
          onColorChange={setColor}
        >
          <CopySketchButton elements={elements} title={autosave.title} disabled={busy} />
        </DrawBar>
      </NoteFrame>
    </div>
  );
}
