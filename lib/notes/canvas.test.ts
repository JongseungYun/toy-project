import { describe, expect, it } from "vitest";
import {
  arrowHeadPath,
  parseCanvasElements,
  penPoints,
  previewFromCanvas,
  type CanvasElement,
} from "@/lib/notes/canvas";

const pen: CanvasElement = {
  id: "a",
  kind: "pen",
  points: [10, 10, 20, 20],
  color: "#2b2b2b",
  width: 2,
};

const label: CanvasElement = {
  id: "b",
  kind: "text",
  x: 40,
  y: 60,
  text: "제주공항 도착",
  color: "#2b2b2b",
  size: 17,
};

describe("previewFromCanvas", () => {
  it("요소를 그대로 담아 목록이 같은 그림을 작게 그릴 수 있게 한다", () => {
    expect(parseCanvasElements(previewFromCanvas([pen, label]))).toEqual([
      pen,
      label,
    ]);
  });

  it("요소가 많으면 앞쪽만 담아 미리보기가 무거워지지 않게 한다", () => {
    const many = Array.from({ length: 80 }, (_, index) => ({
      ...pen,
      id: `pen-${index}`,
    }));
    expect(parseCanvasElements(previewFromCanvas(many))).toHaveLength(40);
  });
});

describe("parseCanvasElements", () => {
  it("비어 있거나 망가진 값은 빈 그림으로 본다", () => {
    expect(parseCanvasElements("")).toEqual([]);
    expect(parseCanvasElements("{not json")).toEqual([]);
    expect(parseCanvasElements('{"kind":"pen"}')).toEqual([]);
  });
});

describe("penPoints", () => {
  it("좌표를 SVG polyline이 읽는 문자열로 바꾼다", () => {
    expect(penPoints([10, 10, 20, 25])).toBe("10,10 20,25");
  });
});

describe("arrowHeadPath", () => {
  it("화살촉이 끝점을 지나는 두 획이다", () => {
    // 오른쪽으로 가는 화살표면 촉은 끝점 왼쪽 위·아래에서 끝점으로 모인다.
    const path = arrowHeadPath(0, 0, 100, 0);
    expect(path).toContain("L 100 0");
    expect(path.startsWith("M 89")).toBe(true);
  });

  it("길이가 0이면 화살촉을 그리지 않는다", () => {
    expect(arrowHeadPath(50, 50, 50, 50)).toBe("");
  });
});
