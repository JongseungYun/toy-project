// 그림판의 그림은 이미지 한 장이 아니라 요소의 목록으로 보관한다.
// spec.md: 그렇지 않으면 이어 그리기와 요소 단위 되돌리기가 성립하지 않는다.

/** 노트 한 장에 해당하는 고정 크기 그림면. 무한 캔버스와 확대·축소는 범위 밖이다. */
export const CANVAS_WIDTH = 620;
export const CANVAS_HEIGHT = 400;

export const CANVAS_TOOLS = [
  "pen",
  "eraser",
  "rect",
  "ellipse",
  "line",
  "arrow",
  "text",
] as const;

export type CanvasTool = (typeof CANVAS_TOOLS)[number];

/** 도형 도구는 시작점과 끝점을 끌어서 그린다. */
export type ShapeKind = "rect" | "ellipse" | "line" | "arrow";

export interface PenElement {
  id: string;
  kind: "pen";
  /** x, y가 번갈아 들어간다. 배열 하나로 두어 저장이 가벼워진다. */
  points: number[];
  color: string;
  width: number;
}

export interface ShapeElement {
  id: string;
  kind: ShapeKind;
  x1: number;
  y1: number;
  x2: number;
  y2: number;
  color: string;
  width: number;
}

export interface TextElement {
  id: string;
  kind: "text";
  x: number;
  y: number;
  text: string;
  color: string;
  size: number;
}

export type CanvasElement = PenElement | ShapeElement | TextElement;

export interface CanvasContent {
  elements: CanvasElement[];
}

// 이름은 사전이 가진다. 여기에는 값만 둔다.
export const STROKE_WIDTHS = [
  { value: 1 },
  { value: 2 },
  { value: 4 },
  { value: 8 },
] as const;

export const STROKE_COLORS = [
  { value: "#2b2b2b" },
  { value: "#b3123f" },
  { value: "#1d4ed8" },
] as const;

// 목록 미리보기에 담을 요소 수. 그림이 아무리 복잡해도 목록이 무거워지지 않게 한다.
const PREVIEW_ELEMENTS = 40;

const SHAPE_KINDS: ShapeKind[] = ["rect", "ellipse", "line", "arrow"];

function isElement(value: unknown): value is CanvasElement {
  if (!value || typeof value !== "object") return false;
  const candidate = value as Record<string, unknown>;
  if (typeof candidate.id !== "string") return false;

  if (candidate.kind === "pen") return Array.isArray(candidate.points);
  if (candidate.kind === "text") return typeof candidate.text === "string";
  return (
    SHAPE_KINDS.includes(candidate.kind as ShapeKind) &&
    typeof candidate.x1 === "number"
  );
}

/** 저장소에서 온 값을 그림 요소로 읽는다. 읽을 수 없으면 빈 그림으로 본다. */
export function parseCanvasElements(raw: unknown): CanvasElement[] {
  let value = raw;

  if (typeof value === "string") {
    if (!value) return [];
    try {
      value = JSON.parse(value);
    } catch {
      return [];
    }
  }

  if (!Array.isArray(value)) return [];
  return value.filter(isElement);
}

/**
 * 그림판의 목록 미리보기. 글이 아니라 그림이므로 요소를 그대로 담아
 * 목록이 같은 renderer로 작게 다시 그린다.
 */
export function previewFromCanvas(elements: CanvasElement[]): string {
  return JSON.stringify(elements.slice(0, PREVIEW_ELEMENTS));
}

/** 그림에 적힌 글 중 첫 번째. 제목을 비운 그림판 노트의 이름으로 쓴다. */
export function firstTextOf(elements: CanvasElement[]): string {
  const found = elements.find(
    (element): element is TextElement =>
      element.kind === "text" && element.text.trim().length > 0,
  );
  return found ? found.text.trim() : "";
}

export function penPoints(points: number[]): string {
  const pairs: string[] = [];
  for (let index = 0; index + 1 < points.length; index += 2) {
    pairs.push(`${points[index]},${points[index + 1]}`);
  }
  return pairs.join(" ");
}

const HEAD_LENGTH = 12;
const HEAD_ANGLE = Math.PI / 7;

/** 화살표의 촉. 선이 끝나는 자리에서 뒤로 두 획을 긋는다. */
export function arrowHeadPath(
  x1: number,
  y1: number,
  x2: number,
  y2: number,
): string {
  const angle = Math.atan2(y2 - y1, x2 - x1);
  if (x1 === x2 && y1 === y2) return "";

  const left = angle + Math.PI - HEAD_ANGLE;
  const right = angle + Math.PI + HEAD_ANGLE;
  const round = (value: number) => Math.round(value * 100) / 100;

  return [
    `M ${round(x2 + HEAD_LENGTH * Math.cos(left))} ${round(y2 + HEAD_LENGTH * Math.sin(left))}`,
    `L ${round(x2)} ${round(y2)}`,
    `L ${round(x2 + HEAD_LENGTH * Math.cos(right))} ${round(y2 + HEAD_LENGTH * Math.sin(right))}`,
  ].join(" ");
}
