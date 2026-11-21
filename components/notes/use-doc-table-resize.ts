"use client";

import { useEffect, type RefObject } from "react";
import { MIN_COLUMN_WIDTH, MIN_ROW_HEIGHT, resizeDocTable } from "@/lib/notes/doc-table";

type Edge = { cell: HTMLTableCellElement; axis: "column" | "row" };

function edgeAt(editor: HTMLElement, event: PointerEvent): Edge | null {
  const target = event.target instanceof Element ? event.target.closest("td, th") : null;
  if (!(target instanceof HTMLTableCellElement) || !editor.contains(target)) return null;
  const box = target.getBoundingClientRect();
  const row = target.parentElement as HTMLTableRowElement;
  if (Math.abs(event.clientX - box.right) <= 6) return { cell: target, axis: "column" };
  if (Math.abs(event.clientX - box.left) <= 6 && target.cellIndex > 0) return { cell: row.cells[target.cellIndex - 1], axis: "column" };
  if (Math.abs(event.clientY - box.bottom) <= 6) return { cell: target, axis: "row" };
  if (Math.abs(event.clientY - box.top) <= 6 && row.rowIndex > 0) {
    const previous = target.closest("table")!.rows[row.rowIndex - 1].cells[target.cellIndex];
    if (previous) return { cell: previous, axis: "row" };
  }
  return null;
}

/** 드래그 중에는 안내선만 움직이고 놓을 때 한 번 편집해 저장·되돌리기를 묶는다. */
export function useDocTableResize(editorRef: RefObject<HTMLDivElement | null>) {
  useEffect(() => {
    const editor = editorRef.current;
    if (!editor) return;
    let drag: (Edge & { pointerId: number; start: number; size: number; next: number; guide: HTMLDivElement }) | null = null;

    function cancel() {
      const previous = drag;
      drag = null;
      previous?.guide.remove();
      editor!.style.removeProperty("cursor");
      if (previous && editor!.hasPointerCapture(previous.pointerId)) editor!.releasePointerCapture(previous.pointerId);
    }

    function move(event: PointerEvent) {
      if (drag) {
        if (event.pointerId !== drag.pointerId) return;
        const column = drag.axis === "column";
        const box = drag.cell.getBoundingClientRect();
        const offset = (column ? event.clientX : event.clientY) - drag.start;
        drag.next = Math.max(column ? MIN_COLUMN_WIDTH : MIN_ROW_HEIGHT, drag.size + offset);
        drag.guide.style[column ? "left" : "top"] = `${(column ? box.left : box.top) + drag.next}px`;
        event.preventDefault();
        return;
      }
      const edge = edgeAt(editor!, event);
      editor!.style.cursor = edge ? edge.axis === "column" ? "col-resize" : "row-resize" : "";
    }

    function down(event: PointerEvent) {
      // 터치 스크롤은 유지한다. 모바일에서는 표 도구의 숫자 입력도 사용할 수 있다.
      if (event.button !== 0 || event.pointerType === "touch") return;
      const edge = edgeAt(editor!, event);
      if (!edge) return;
      const column = edge.axis === "column";
      const box = edge.cell.getBoundingClientRect();
      const bounds = edge.cell.closest("table")!.getBoundingClientRect();
      const guide = document.createElement("div");
      guide.className = "doc-table-resize-guide";
      guide.setAttribute("aria-hidden", "true");
      Object.assign(guide.style, column
        ? { left: `${box.right}px`, top: `${bounds.top}px`, width: "2px", height: `${bounds.height}px` }
        : { left: `${bounds.left}px`, top: `${box.bottom}px`, width: `${bounds.width}px`, height: "2px" });
      document.body.append(guide);
      drag = { ...edge, pointerId: event.pointerId, start: column ? event.clientX : event.clientY, size: column ? box.width : box.height, next: column ? box.width : box.height, guide };
      editor!.setPointerCapture(event.pointerId);
      event.preventDefault();
    }

    function up(event: PointerEvent) {
      if (!drag || drag.pointerId !== event.pointerId) return;
      const { cell, axis, size, next } = drag;
      cancel();
      const table = cell.closest("table");
      if (!table || !editor!.contains(table) || Math.abs(next - size) < 1) return;
      resizeDocTable(editor!, table, (cell.parentElement as HTMLTableRowElement).rowIndex, cell.cellIndex,
        axis === "column" ? { width: next } : { height: next });
      editor!.dispatchEvent(new Event("input", { bubbles: true }));
    }

    function key(event: KeyboardEvent) {
      if (drag && event.key === "Escape") { event.preventDefault(); cancel(); }
    }

    function leave() { if (!drag) editor!.style.removeProperty("cursor"); }
    editor.addEventListener("pointermove", move);
    editor.addEventListener("pointerdown", down);
    editor.addEventListener("pointerup", up);
    editor.addEventListener("pointercancel", cancel);
    editor.addEventListener("lostpointercapture", cancel);
    editor.addEventListener("pointerleave", leave);
    document.addEventListener("keydown", key);
    return () => {
      cancel();
      editor.removeEventListener("pointermove", move);
      editor.removeEventListener("pointerdown", down);
      editor.removeEventListener("pointerup", up);
      editor.removeEventListener("pointercancel", cancel);
      editor.removeEventListener("lostpointercapture", cancel);
      editor.removeEventListener("pointerleave", leave);
      document.removeEventListener("keydown", key);
    };
  }, [editorRef]);
}
