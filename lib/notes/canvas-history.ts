import type { CanvasElement } from "@/lib/notes/canvas";

export interface CanvasHistory {
  past: CanvasElement[][];
  present: CanvasElement[];
  future: CanvasElement[][];
}

export function createCanvasHistory(elements: CanvasElement[]): CanvasHistory {
  return { past: [], present: elements, future: [] };
}

/** 요소 배열은 편집할 때 새로 만든다. 이전 배열을 보관해 순서와 서식을 함께 복원한다. */
export function recordCanvasChange(history: CanvasHistory, next: CanvasElement[]): CanvasHistory {
  if (next === history.present) return history;
  return { past: [...history.past, history.present], present: next, future: [] };
}

export function undoCanvas(history: CanvasHistory): CanvasHistory {
  if (!history.past.length) return history;
  return {
    past: history.past.slice(0, -1),
    present: history.past[history.past.length - 1],
    future: [history.present, ...history.future],
  };
}

export function redoCanvas(history: CanvasHistory): CanvasHistory {
  if (!history.future.length) return history;
  return {
    past: [...history.past, history.present],
    present: history.future[0],
    future: history.future.slice(1),
  };
}
