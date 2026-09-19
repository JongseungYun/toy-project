import type { CSSProperties } from "react";
import Markdown from "react-markdown";
import remarkGfm from "remark-gfm";
import {
  CANVAS_HEIGHT,
  CANVAS_WIDTH,
  parseCanvasElements,
} from "@/lib/notes/canvas";
import { sanitizeHtml } from "@/lib/notes/sanitize";
import type {
  DocContent,
  MarkdownContent,
  NoteContent,
  NoteFormat,
} from "@/lib/notes/types";
import { CanvasShape } from "@/components/notes/canvas-figure";

/**
 * 고칠 수 없는 노트 한 장. 공유 링크로 들어온 사람이 보는 화면이다.
 *
 * 편집기와 같은 내용을 같은 모양으로 보여주되 손댈 수 있는 것은 두지 않는다.
 * 그림판은 편집 화면·목록 미리보기와 같은 renderer로 그린다.
 */
export function NoteReader({
  format,
  content,
  surface,
}: {
  format: NoteFormat;
  content: NoteContent;
  surface?: CSSProperties;
}) {
  if (format === "canvas") {
    const elements = parseCanvasElements((content as { elements?: unknown }).elements);

    return (
      <div className="flex justify-center overflow-auto p-5">
        <svg
          data-testid="shared-body"
          role="img"
          width={CANVAS_WIDTH}
          height={CANVAS_HEIGHT}
          viewBox={`0 0 ${CANVAS_WIDTH} ${CANVAS_HEIGHT}`}
          style={surface}
          className="rounded-md border border-border bg-[#fffdf8] shadow-sm"
        >
          {elements.map((element) => (
            <CanvasShape key={element.id} element={element} />
          ))}
        </svg>
      </div>
    );
  }

  if (format === "markdown") {
    return (
      <div
        data-testid="shared-body"
        style={surface}
        className="prose-md p-5 text-sm sm:p-8"
      >
        <Markdown remarkPlugins={[remarkGfm]}>
          {(content as MarkdownContent).source ?? ""}
        </Markdown>
      </div>
    );
  }

  // 일반 문서의 서식은 본문에 인라인 style로 박혀 있어 그대로 두어야 같은 모양이
  // 된다. 남의 브라우저에서 열리는 화면이므로 코드를 돌릴 수 있는 것만 걷어 낸다.
  return (
    <div
      data-testid="shared-body"
      style={surface}
      className="p-5 text-[15px] leading-7 sm:p-8"
      dangerouslySetInnerHTML={{
        __html: sanitizeHtml((content as DocContent).html ?? ""),
      }}
    />
  );
}
