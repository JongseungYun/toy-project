import { fromHtml } from "hast-util-from-html";
import type { RootContent } from "hast";
import { escapeHtml } from "@/lib/utils";

const tags = new Set(
  "p div span ul ol li br b strong i em u s strike font h1 h2 h3 h4 h5 h6 pre blockquote code a table thead tbody tfoot tr th td hr".split(
    " ",
  ),
);
const skip = new Set(
  "script style iframe object embed form svg math img input textarea button select template".split(
    " ",
  ),
);
const properties = new Set(
  "color background-color font-family font-size font-weight font-style text-decoration text-decoration-line text-align line-height white-space width max-width min-width margin margin-left margin-right margin-top margin-bottom padding padding-left padding-right padding-top padding-bottom border border-left border-right border-top border-bottom list-style-type".split(
    " ",
  ),
);

/** 파일은 외부에서 전달받았을 수 있다. HTML 파서가 해석한 속성 값을 검증한다. */
export function backupHtml(html: string): string {
  function visit(node: RootContent): string {
    if (node.type === "text") return escapeHtml(node.value);
    if (node.type !== "element" || skip.has(node.tagName)) return "";
    const children = node.children.map(visit).join("");
    if (!tags.has(node.tagName)) return children;
    const attrs: string[] = [];
    const add = (key: string, value: string) =>
      attrs.push(`${key}="${escapeHtml(value)}"`);
    const style = node.properties.style;
    if (typeof style === "string") {
      const parts = style.split(";");
      const safe = parts.filter(
        (part) =>
          !part.trim() ||
          (properties.has(part.split(":", 1)[0].trim().toLowerCase()) &&
            !/url\s*\(|expression|@import|[<>]/i.test(part)),
      );
      if (safe.some((part) => part.trim())) add("style", safe.join(";"));
    }
    if (node.tagName === "a" && typeof node.properties.href === "string") {
      const href = node.properties.href.replace(/[\u0000-\u0020]/g, "");
      if (/^(https?:|mailto:|tel:|#|\/)/i.test(href)) add("href", href);
    }
    for (const key of [
      "color",
      "face",
      "size",
      "align",
      "start",
      "type",
      "colSpan",
      "rowSpan",
    ]) {
      const value = node.properties[key];
      if (typeof value === "string" || typeof value === "number")
        add(key.toLowerCase(), String(value));
    }
    const open = `<${node.tagName}${attrs.length ? " " + attrs.join(" ") : ""}>`;
    return ["br", "hr"].includes(node.tagName)
      ? open
      : `${open}${children}</${node.tagName}>`;
  }
  return fromHtml(html, { fragment: true }).children.map(visit).join("");
}
