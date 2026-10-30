import { fromHtml } from "hast-util-from-html";
import { toText } from "hast-util-to-text";
import { unified } from "unified";
import remarkParse from "remark-parse";
import remarkGfm from "remark-gfm";
import { parseCanvasElements } from "./canvas";
import { normalizeSearchText } from "./search";
import type { NoteContent, NoteFormat } from "./types";

const markdown = unified().use(remarkParse).use(remarkGfm);

interface TextNode {
  type: string;
  value?: string;
  children?: TextNode[];
}

function markdownText(node: TextNode): string {
  if (["image", "imageReference", "definition"].includes(node.type)) return "";
  if (node.type === "html") {
    return toText(fromHtml(node.value ?? "", { fragment: true }));
  }
  if (node.type === "break") return "\n";
  if (node.value !== undefined) return node.value;
  const separator = [
    "root",
    "list",
    "listItem",
    "blockquote",
    "table",
    "tableRow",
  ].includes(node.type)
    ? "\n"
    : "";
  return (node.children ?? []).map(markdownText).join(separator);
}

/** 본문 전체에서 글만 추출한다. 목록 미리보기의 길이 제한과는 무관하다. */
export function searchableText(
  format: NoteFormat,
  content: NoteContent,
): string {
  if (
    format === "doc" &&
    "html" in content &&
    typeof content.html === "string"
  ) {
    return normalizeSearchText(
      toText(fromHtml(content.html, { fragment: true })),
    );
  }
  if (
    format === "markdown" &&
    "source" in content &&
    typeof content.source === "string"
  ) {
    return normalizeSearchText(markdownText(markdown.parse(content.source)));
  }
  if (format === "canvas" && "elements" in content) {
    return normalizeSearchText(
      parseCanvasElements(content.elements)
        .filter((element) => element.kind === "text")
        .map((element) => element.text)
        .join("\n"),
    );
  }
  return "";
}
