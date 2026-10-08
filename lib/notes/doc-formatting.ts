import { FONT_OPTIONS, SIZE_OPTIONS } from "@/lib/notes/rich-text";

const BLOCKS = new Set(["P", "DIV", "UL", "OL", "LI"]);
const SKIP = new Set(["SCRIPT", "STYLE", "IFRAME", "OBJECT", "EMBED", "IMG"]);
const INLINE = new Set(["B", "STRONG", "I", "EM", "U", "S", "STRIKE", "SPAN"]);

type TextStyle = Partial<Record<"color" | "backgroundColor" | "fontFamily" | "fontSize" | "fontWeight" | "fontStyle" | "textDecoration", string>>;
const clearHistory = new WeakMap<HTMLElement, { before: string; after: string }>();

/** 직접 정리한 HTML도 한 번의 되돌리기·다시 실행으로 복원한다. */
export function restoreDocFormatting(editor: HTMLElement, redo = false): boolean {
  const history = clearHistory.get(editor);
  if (!history || editor.innerHTML !== (redo ? history.before : history.after)) return false;
  editor.innerHTML = redo ? history.after : history.before;
  const range = document.createRange();
  range.selectNodeContents(editor);
  range.collapse(false);
  const selection = window.getSelection();
  selection?.removeAllRanges();
  selection?.addRange(range);
  return true;
}

function fontKey(value: string) {
  return value.replace(/['"]/g, "").replace(/\s+/g, " ").trim().toLowerCase();
}

/** 외부 HTML을 편집기가 다시 수정할 수 있는 서식으로 받아들인다. */
export function normalizeDocHtml(html: string, clearFormatting = false): string {
  const source = document.createElement("div");
  source.innerHTML = html;
  const output = document.createElement("div");

  function visit(node: Node, parent: HTMLElement, inherited: TextStyle, pre: boolean) {
    if (node.nodeType === Node.TEXT_NODE) {
      const text = node.textContent ?? "";
      const target = Object.keys(inherited).length ? document.createElement("span") : parent;
      if (target !== parent) {
        Object.assign(target.style, inherited);
        parent.append(target);
      }
      text.split(pre ? /\r\n|\r|\n/ : /$^/).forEach((part, index) => {
        if (index) target.append(document.createElement("br"));
        target.append(document.createTextNode(part));
      });
      return;
    }
    if (!(node instanceof HTMLElement) || SKIP.has(node.tagName)) return;
    if (node.tagName === "BR") {
      parent.append(document.createElement("br"));
      return;
    }

    const block = BLOCKS.has(node.tagName) || /^(H[1-6]|PRE|BLOCKQUOTE|SECTION|ARTICLE|TR)$/.test(node.tagName);
    const tag = BLOCKS.has(node.tagName) ? node.tagName.toLowerCase() : block ? "div" : "span";
    const target = block || (!clearFormatting && INLINE.has(node.tagName))
      ? document.createElement(block ? tag : node.tagName.toLowerCase())
      : parent;
    if (target !== parent) parent.append(target);

    const style: TextStyle = clearFormatting ? {} : { ...inherited };
    if (!clearFormatting) {
      const css = node.style;
      if (css.color || node.getAttribute("color")) style.color = css.color || node.getAttribute("color")!;
      // 외부 문단 배경은 제외하고, 글 일부의 형광펜만 유지한다.
      if (!block && css.backgroundColor) style.backgroundColor = css.backgroundColor;
      const family = css.fontFamily || node.getAttribute("face") || "";
      const font = FONT_OPTIONS.find((option) => fontKey(option.value) === fontKey(family));
      if (font) style.fontFamily = font.value;
      const size = css.fontSize.replace("px", "");
      if (SIZE_OPTIONS.includes(size as never)) style.fontSize = `${size}px`;
      if (css.fontWeight === "bold" || Number(css.fontWeight) >= 600) style.fontWeight = "bold";
      if (css.fontStyle === "italic") style.fontStyle = "italic";
      const decoration = css.textDecorationLine || css.textDecoration;
      const supported = ["underline", "line-through"].filter((value) => decoration.includes(value));
      if (supported.length) style.textDecoration = supported.join(" ");
      if (block && ["left", "center", "right"].includes(css.textAlign)) target.style.textAlign = css.textAlign;
    }
    for (const child of node.childNodes) visit(child, target, style, pre || node.tagName === "PRE" || node.style.whiteSpace.startsWith("pre"));
  }

  for (const child of source.childNodes) visit(child, output, {}, false);
  return output.innerHTML;
}

/** 일반 텍스트의 줄바꿈을 보존하고 HTML로 해석하지 않는다. */
export function plainTextHtml(text: string): string {
  const container = document.createElement("div");
  text.split(/\r\n|\r|\n/).forEach((line, index) => {
    if (index) container.append(document.createElement("br"));
    container.append(document.createTextNode(line));
  });
  return container.innerHTML;
}

/** 선택한 문단만 정리하고 목록의 다른 항목에 있는 서식은 남긴다. */
export function clearDocFormatting(editor: HTMLElement) {
  const selection = window.getSelection();
  if (!selection?.rangeCount) return;
  const range = selection.getRangeAt(0);
  if (!editor.contains(range.commonAncestorContainer)) return;
  const before = range.cloneRange();
  before.selectNodeContents(editor);
  before.setEnd(range.startContainer, range.startOffset);
  const startOffset = before.toString().length;
  const endOffset = startOffset + range.toString().length;
  const copy = editor.cloneNode(true) as HTMLElement;
  const targets = new Set<HTMLElement>();
  const originalWalk = document.createTreeWalker(editor, NodeFilter.SHOW_TEXT);
  const copyWalk = document.createTreeWalker(copy, NodeFilter.SHOW_TEXT);
  let text: Node | null;
  while ((text = originalWalk.nextNode())) {
    const copiedText = copyWalk.nextNode()!;
    if (!range.intersectsNode(text)) continue;
    if (!range.collapsed && ((text === range.startContainer && range.startOffset === text.textContent?.length) || (text === range.endContainer && range.endOffset === 0))) continue;
    let block = copiedText.parentElement!;
    while (block.parentElement !== copy && !BLOCKS.has(block.tagName)) block = block.parentElement!;
    targets.add(block);
  }
  if (!targets.size) return;

  for (const block of targets) {
    if ([...targets].some((other) => other !== block && other.contains(block))) continue;
    // 공통 부모의 배경 등을 형제에게 옮긴 뒤 선택한 항목의 서식을 지운다.
    const ancestors: HTMLElement[] = [];
    for (let parent = block.parentElement; parent && parent !== copy; parent = parent.parentElement) ancestors.unshift(parent);
    for (const parent of ancestors) {
      for (const child of [...parent.childNodes]) {
        const wrapper = document.createElement("span");
        const element = child instanceof HTMLElement ? child : wrapper;
        if (element === wrapper) { child.replaceWith(wrapper); wrapper.append(child); }
        for (const prop of Array.from(parent.style)) {
          if (!element.style.getPropertyValue(prop)) element.style.setProperty(prop, parent.style.getPropertyValue(prop));
        }
      }
      parent.removeAttribute("style");
      parent.removeAttribute("class");
    }
    if (block === copy) copy.innerHTML = normalizeDocHtml(copy.innerHTML, true);
    else block.outerHTML = normalizeDocHtml(block.outerHTML, true);
  }

  // insertHTML은 기존 목록의 부모 서식을 다시 병합하므로, 정리한 구조를 직접
  // 교체하고 이 변경의 전후를 되돌리기용으로 보관한다.
  const previous = editor.innerHTML;
  editor.innerHTML = copy.innerHTML;
  if (previous !== editor.innerHTML) clearHistory.set(editor, { before: previous, after: editor.innerHTML });
  const restored = document.createRange();
  const walk = document.createTreeWalker(editor, NodeFilter.SHOW_TEXT);
  let seen = 0;
  let started = false;
  while ((text = walk.nextNode())) {
    const length = text.textContent?.length ?? 0;
    if (!started && seen + length >= startOffset) {
      restored.setStart(text, startOffset - seen);
      started = true;
    }
    if (started && seen + length >= endOffset) {
      restored.setEnd(text, endOffset - seen);
      selection.removeAllRanges();
      selection.addRange(restored);
      break;
    }
    seen += length;
  }
}
