import { fromHtml } from "hast-util-from-html";
import { toHtml } from "hast-util-to-html";
import type { RootContent } from "hast";

export function isWhiteBackground(value: string): boolean {
  return /^(?:white|#fff(?:fff)?|rgb\(255,255,255\)|rgba\(255,255,255,1\))$/i.test(value.replace(/\s/g, ""));
}

/** 예전에 저장된 머리글도 같은 정책으로 읽는다. 글·다른 색·다른 셀은 유지한다. */
export function normalizeTableHeaderHtml(html: string): string {
  if (!/<th\b/i.test(html)) return html;
  const tree = fromHtml(html, { fragment: true });
  let changed = false;
  function visit(node: RootContent, inHeader: boolean) {
    if (node.type !== "element") return;
    const header = inHeader || node.tagName === "th";
    const style = node.properties.style;
    if (header && node.tagName !== "th" && typeof style === "string") {
      const clean = style.split(";").filter((part) => {
        const [name, ...value] = part.split(":");
        const remove = /^background(?:-color)?$/i.test(name.trim()) && isWhiteBackground(value.join(":").trim());
        if (remove) changed = true;
        return !remove;
      }).join(";");
      if (clean.trim()) node.properties.style = clean;
      else delete node.properties.style;
    }
    node.children.forEach((child) => visit(child, header));
  }
  tree.children.forEach((node) => visit(node, false));
  return changed ? toHtml(tree) : html;
}

/** 입력 중에는 DOM 전체를 교체하지 않고 선택 위치를 유지하며 배경만 지운다. */
export function clearWhiteHeaderBackgrounds(editor: HTMLElement) {
  editor.querySelectorAll<HTMLElement>("th [style]").forEach((element) => {
    if (isWhiteBackground(element.style.backgroundColor)) element.style.removeProperty("background-color");
  });
}
