import {
  arrowHeadPath,
  penPoints,
  type CanvasElement,
} from "@/lib/notes/canvas";

// 지우개로 집을 때 쓰는 굵기. 가는 선도 겨냥하기 쉬워야 한다.
const HIT_WIDTH = 16;

/**
 * 그림 요소 하나를 SVG로 그린다. 편집 화면과 목록 미리보기가 같은 그림을
 * 같은 규칙으로 그리도록 renderer는 이 한 곳에만 둔다.
 *
 * hitArea로 부르면 같은 모양을 보이지 않는 굵은 획으로 한 번 더 깐다.
 * 지우개가 그것을 집는다.
 */
export function CanvasShape({
  element,
  hitArea = false,
}: {
  element: CanvasElement;
  hitArea?: boolean;
}) {
  if (element.kind === "text") {
    return (
      <text
        x={element.x}
        y={element.y}
        fill={hitArea ? "transparent" : element.color}
        fontSize={element.size}
        fontFamily="ui-sans-serif, system-ui, sans-serif"
      >
        {element.text}
      </text>
    );
  }

  const paint = hitArea
    ? {
        fill: "none",
        stroke: "transparent",
        strokeWidth: Math.max(element.width, HIT_WIDTH),
      }
    : { fill: "none", stroke: element.color, strokeWidth: element.width };

  const stroke = {
    ...paint,
    strokeLinecap: "round" as const,
    strokeLinejoin: "round" as const,
  };

  if (element.kind === "pen") {
    return <polyline points={penPoints(element.points)} {...stroke} />;
  }

  if (element.kind === "rect") {
    return (
      <rect
        x={Math.min(element.x1, element.x2)}
        y={Math.min(element.y1, element.y2)}
        width={Math.abs(element.x2 - element.x1)}
        height={Math.abs(element.y2 - element.y1)}
        rx={8}
        {...stroke}
      />
    );
  }

  if (element.kind === "ellipse") {
    return (
      <ellipse
        cx={(element.x1 + element.x2) / 2}
        cy={(element.y1 + element.y2) / 2}
        rx={Math.abs(element.x2 - element.x1) / 2}
        ry={Math.abs(element.y2 - element.y1) / 2}
        {...stroke}
      />
    );
  }

  return (
    <>
      <path
        d={`M ${element.x1} ${element.y1} L ${element.x2} ${element.y2}`}
        {...stroke}
      />
      {element.kind === "arrow" && !hitArea && (
        <path
          d={arrowHeadPath(element.x1, element.y1, element.x2, element.y2)}
          {...stroke}
        />
      )}
    </>
  );
}
