import { describe, expect, it } from "vitest";
import type { CanvasElement } from "./canvas";
import { createCanvasHistory, recordCanvasChange, redoCanvas, undoCanvas } from "./canvas-history";

const a: CanvasElement = { id: "a", kind: "rect", x1: 10, y1: 20, x2: 30, y2: 40, width: 4, color: "red" };
const b: CanvasElement = { id: "b", kind: "text", x: 15, y: 30, size: 17, text: "글상자", color: "blue" };
const c: CanvasElement = { id: "c", kind: "pen", points: [1, 2, 3, 4], width: 2, color: "black" };

describe("그림판 작업 이력", () => {
  it("삭제를 되돌리면 요소 ID·순서·서식을 그대로 복원하고 다시 삭제한다", () => {
    const base = createCanvasHistory([a, b, c]);
    const erased = recordCanvasChange(base, [b]);
    const restored = undoCanvas(erased);
    expect(restored.present).toEqual([a, b, c]);
    expect(redoCanvas(restored).present).toEqual([b]);
    expect(base.present).toEqual([a, b, c]);
  });

  it("여러 번 추가하고 되돌리고 다시 실행한 뒤 새 편집을 하면 이전 갈래를 비운다", () => {
    let state = createCanvasHistory([]);
    state = recordCanvasChange(state, [a]);
    state = recordCanvasChange(state, [a, b]);
    state = recordCanvasChange(state, [a, b, c]);
    state = undoCanvas(undoCanvas(state));
    expect(state.present).toEqual([a]);
    state = redoCanvas(state);
    expect(state.present).toEqual([a, b]);
    state = recordCanvasChange(state, [b]);
    expect(redoCanvas(state)).toBe(state);
    expect(undoCanvas(state).present).toEqual([a, b]);
  });

  it("빈 작업과 이력 끝의 되돌리기는 그림이나 다시 실행 목록을 바꾸지 않는다", () => {
    const base = createCanvasHistory([a]);
    expect(undoCanvas(base)).toBe(base);
    expect(redoCanvas(base)).toBe(base);
    const undone = undoCanvas(recordCanvasChange(base, []));
    const unchanged = recordCanvasChange(undone, undone.present);
    expect(unchanged).toBe(undone);
    expect(redoCanvas(unchanged).present).toEqual([]);
  });
});
