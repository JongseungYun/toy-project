import { createElement } from "react";
import type { CanvasElement } from "@/lib/notes/canvas";
import { shapeParts } from "@/lib/notes/canvas-shape";

/**
 * 그림 요소 하나를 SVG로 그린다. 편집 화면과 목록 미리보기가 같은 그림을
 * 같은 규칙으로 그리도록, 무엇을 그릴지는 lib/notes/canvas-shape.ts가 정한다.
 * 여기서는 그것을 React 요소로 옮기기만 한다. 내보내기는 같은 것을 글자로 옮긴다.
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
  return (
    <>
      {shapeParts(element, hitArea).map((part, index) =>
        createElement(part.tag, { key: index, ...part.attrs }, part.text),
      )}
    </>
  );
}
