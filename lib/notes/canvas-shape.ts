// 그림 요소 하나가 어떤 SVG 도형이 되는지.
//
// 편집 화면, 목록 미리보기, 공유 화면은 React로 그리고, 내보내기는 같은 그림을
// 글자로 적어 파일에 담는다. 두 길이 서로 다른 그림을 그리지 않도록 "무엇을
// 그리는가"는 여기 한 곳에서만 정하고, React와 문자열은 그것을 옮겨 적기만 한다.

import { arrowHeadPath, penPoints, type CanvasElement } from "@/lib/notes/canvas";
import { escapeHtml } from "@/lib/utils";

/** 지우개로 집을 때 쓰는 굵기. 가는 선도 겨냥하기 쉬워야 한다. */
const HIT_WIDTH = 16;

/** SVG 도형 하나. 속성 이름은 React가 쓰는 대로 적는다. */
export interface SvgPart {
  tag: "polyline" | "rect" | "ellipse" | "path" | "text";
  attrs: Record<string, string | number>;
  /** text 도형에만 있다. */
  text?: string;
}

/**
 * 요소 하나가 되는 도형들. 화살표처럼 획이 둘인 것은 둘을 돌려준다.
 *
 * hitArea로 부르면 같은 모양을 보이지 않는 굵은 획으로 돌려준다.
 * 지우개가 그것을 집는다.
 */
export function shapeParts(element: CanvasElement, hitArea = false): SvgPart[] {
  if (element.kind === "text") {
    return [
      {
        tag: "text",
        attrs: {
          x: element.x,
          y: element.y,
          fill: hitArea ? "transparent" : element.color,
          fontSize: element.size,
          fontFamily: "ui-sans-serif, system-ui, sans-serif",
        },
        text: element.text,
      },
    ];
  }

  const stroke = {
    fill: "none",
    stroke: hitArea ? "transparent" : element.color,
    strokeWidth: hitArea ? Math.max(element.width, HIT_WIDTH) : element.width,
    strokeLinecap: "round",
    strokeLinejoin: "round",
  };

  if (element.kind === "pen") {
    return [{ tag: "polyline", attrs: { points: penPoints(element.points), ...stroke } }];
  }

  if (element.kind === "rect") {
    return [
      {
        tag: "rect",
        attrs: {
          x: Math.min(element.x1, element.x2),
          y: Math.min(element.y1, element.y2),
          width: Math.abs(element.x2 - element.x1),
          height: Math.abs(element.y2 - element.y1),
          rx: 8,
          ...stroke,
        },
      },
    ];
  }

  if (element.kind === "ellipse") {
    return [
      {
        tag: "ellipse",
        attrs: {
          cx: (element.x1 + element.x2) / 2,
          cy: (element.y1 + element.y2) / 2,
          rx: Math.abs(element.x2 - element.x1) / 2,
          ry: Math.abs(element.y2 - element.y1) / 2,
          ...stroke,
        },
      },
    ];
  }

  const parts: SvgPart[] = [
    {
      tag: "path",
      attrs: {
        d: `M ${element.x1} ${element.y1} L ${element.x2} ${element.y2}`,
        ...stroke,
      },
    },
  ];

  // 촉은 겨냥할 자리를 넓히는 데 보탬이 되지 않는다. 획만 굵게 깔면 된다.
  if (element.kind === "arrow" && !hitArea) {
    parts.push({
      tag: "path",
      attrs: {
        d: arrowHeadPath(element.x1, element.y1, element.x2, element.y2),
        ...stroke,
      },
    });
  }

  return parts;
}

/** React는 camelCase로 받지만 파일에 적는 SVG는 하이픈으로 적는다. */
function attributeName(key: string): string {
  return key.replace(/[A-Z]/g, (letter) => `-${letter.toLowerCase()}`);
}

/** 도형들을 SVG 글자로 적는다. 내보내는 파일이 이것을 담는다. */
export function partsToSvg(parts: SvgPart[]): string {
  return parts
    .map((part) => {
      const attrs = Object.entries(part.attrs)
        .map(([key, value]) => `${attributeName(key)}="${escapeHtml(String(value))}"`)
        .join(" ");

      return part.text === undefined
        ? `<${part.tag} ${attrs}/>`
        : `<${part.tag} ${attrs}>${escapeHtml(part.text)}</${part.tag}>`;
    })
    .join("\n");
}

/** 그림 전체를 SVG 글자로. 화면이 그리는 것과 같은 도형을 같은 차례로 적는다. */
export function elementsToSvg(elements: CanvasElement[]): string {
  return partsToSvg(elements.flatMap((element) => shapeParts(element)));
}
