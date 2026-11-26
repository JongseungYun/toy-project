import type { RootContent } from "mdast";
import remarkGfm from "remark-gfm";
import remarkParse from "remark-parse";
import { unified } from "unified";

const markdown = unified().use(remarkParse).use(remarkGfm);

function hasListMarker(nodes: RootContent[], offset: number): boolean {
  for (const node of nodes) {
    if (!node.position || node.position.start.offset! > offset) break;
    if (node.position.end.offset! < offset) continue;
    if (node.type === "listItem" && node.position.start.offset === offset) return true;
    if ("children" in node && hasListMarker(node.children, offset)) return true;
  }
  return false;
}

export function markdownListEdit(source: string, start: number, end: number) {
  if (start !== end) return null;
  const lineStart = source.lastIndexOf("\n", start - 1) + 1;
  const nextBreak = source.indexOf("\n", start);
  const line = source.slice(lineStart, nextBreak < 0 ? source.length : nextBreak);
  const match = /^([ \t]*)([-+*]|\d{1,9}[.)])([ \t]+|$)(?:\[[ xX]\]([ \t]+|$))?/.exec(line);
  if (!match || start < lineStart + match[0].length) return null;
  const [, indent, marker, space, taskSpace] = match;
  // 원문에 같은 기호가 있어도 코드 블록·표·구분선이면 일반 줄바꿈을 쓴다.
  if (!hasListMarker(markdown.parse(source).children, lineStart + indent.length)) return null;
  if (match[0].length === line.length) return { start: lineStart, end: start, text: "" };
  let next = marker;
  if (marker.length > 1) {
    const digits = marker.slice(0, -1);
    const number = String(Number(digits) + 1);
    if (number.length > 9) return null;
    next = number.padStart(digits.length, "0") + marker.at(-1);
  }
  return { start, end, text: "\n" + indent + next + space + (taskSpace ? "[ ]" + taskSpace : "") };
}
