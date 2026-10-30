// 일반 문서의 서식. contentEditable 위에서 브라우저가 제공하는 편집 명령을 쓰고,
// 결과는 인라인 style로 남아 그대로 저장된다.

/**
 * 고를 수 있는 글꼴. 값은 브라우저가 실제로 쓸 글꼴 차례다.
 *
 * 이미 쓴 노트에는 이 값이 그대로 박혀 있다. 되읽을 때 견주는 것도 이 값이라,
 * 한 번 내보낸 value는 바꾸지 않고 새 줄만 더한다.
 *
 * 웹폰트를 새로 받아오지 않고 기기에 있는 글꼴에 기댄다. 한 벌 더 받는 값이
 * 글꼴 넷을 더하는 값보다 크고, 기기마다 조금씩 달라 보이는 것은 문서 글꼴을
 * 고르는 일에서 받아들일 만하다.
 */
export const FONT_OPTIONS = [
  { label: "본고딕", value: "'Noto Sans KR', 'Malgun Gothic', sans-serif" },
  { label: "나눔고딕", value: "'Nanum Gothic', 'Apple SD Gothic Neo', sans-serif" },
  { label: "나눔명조", value: "'Nanum Myeongjo', 'Batang', serif" },
  { label: "궁서", value: "Gungsuh, 'AppleMyungjo', serif" },
  { label: "Arial", value: "Arial, Helvetica, sans-serif" },
  { label: "Georgia", value: "Georgia, serif" },
  { label: "Times", value: "'Times New Roman', Times, serif" },
  { label: "코드용 고정폭", value: "var(--font-geist-mono), monospace" },
] as const;

/** 작은 주석부터 표지 제목까지 한 줄에서 고를 수 있게 둔다. 기본은 15다. */
export const SIZE_OPTIONS = [
  "11",
  "12",
  "14",
  "15",
  "17",
  "20",
  "24",
  "30",
  "36",
  "48",
] as const;

/** 굵게·기울임·목록·정렬처럼 값이 없거나 단순한 명령. */
export function applyCommand(command: string, value?: string) {
  document.execCommand("styleWithCSS", false, "true");
  document.execCommand(command, false, value);
}

/**
 * 글자 크기. execCommand의 fontSize는 1–7 단계만 받아서 px을 직접 넣을 수 없다.
 * 쓰지 않는 7단계로 한 번 감싼 뒤 그 자리를 원하는 px의 span으로 바꾼다.
 */
export function applyFontSize(editor: HTMLElement, px: string) {
  document.execCommand("styleWithCSS", false, "false");
  document.execCommand("fontSize", false, "7");

  editor.querySelectorAll('font[size="7"]').forEach((node) => {
    const span = document.createElement("span");
    span.style.fontSize = `${px}px`;
    while (node.firstChild) span.appendChild(node.firstChild);
    node.replaceWith(span);
  });
}

/** 지금 고른 자리에 걸려 있는 서식. 도구 막대가 이것을 그대로 비춘다. */
export type FormatState = {
  /** 켜져 있는 명령. queryCommandState가 참을 준 것만 담는다. */
  on: Record<string, boolean>;
  font: string;
  size: string;
  color: SelectionColor;
  highlight: SelectionColor;
};

export type SelectionColor = { kind: "color"; value: string } | { kind: "mixed" } | { kind: "none" };

/** 눌림 여부를 물어볼 수 있는 명령들. */
export const STATE_COMMANDS = [
  "bold",
  "italic",
  "underline",
  "strikeThrough",
  "insertUnorderedList",
  "insertOrderedList",
  "justifyLeft",
  "justifyCenter",
  "justifyRight",
] as const;

/** 본문이 아무 서식도 걸치지 않았을 때의 모습. 편집 영역의 기본값과 같다. */
export const DEFAULT_FONT = FONT_OPTIONS[0].value;
export const DEFAULT_SIZE = "15";

/** 글꼴 이름은 따옴표와 띄어쓰기가 브라우저마다 달라, 견줄 수 있게 다듬는다. */
function normalize(value: string) {
  return value.replace(/['"]/g, "").replace(/\s+/g, " ").trim().toLowerCase();
}

/**
 * 고른 자리에서 위로 올라가며 인라인 style에 적힌 값을 찾는다.
 * 서식을 넣을 때 우리가 직접 적어 둔 값이라, 계산된 값보다 되읽기가 정확하다.
 */
function inlineValue(
  editor: HTMLElement,
  node: Node | null,
  prop: "fontFamily" | "fontSize" | "color",
): string | null {
  let el =
    node?.nodeType === Node.TEXT_NODE
      ? node.parentElement
      : (node as HTMLElement | null);

  while (el && editor.contains(el)) {
    const value = el.style?.[prop];
    if (value) return value;
    if (el === editor) break;
    el = el.parentElement;
  }
  return null;
}

/** CSS가 저장한 rgb·이름·테마 색을 같은 sRGB 값으로 비교한다. */
function colorReader() {
  const canvas = document.createElement("canvas");
  canvas.width = canvas.height = 1;
  const context = canvas.getContext("2d", { willReadFrequently: true })!;
  const values = new Map<string, string | null>();
  return (css: string): string | null => {
    if (values.has(css)) return values.get(css)!;
    context.clearRect(0, 0, 1, 1);
    context.fillStyle = css;
    context.fillRect(0, 0, 1, 1);
    const [r, g, b, alpha] = context.getImageData(0, 0, 1, 1).data;
    const hex = (n: number) => n.toString(16).padStart(2, "0");
    const value = alpha === 0 ? null : `#${hex(r)}${hex(g)}${hex(b)}${alpha === 255 ? "" : hex(alpha)}`;
    values.set(css, value);
    return value;
  };
}

export function defaultTextColor(editor: HTMLElement): string {
  return colorReader()(getComputedStyle(editor).color) ?? "#000000";
}

function selectionColors(editor: HTMLElement): Pick<FormatState, "color" | "highlight"> {
  const read = colorReader();
  const fallback = read(getComputedStyle(editor).color) ?? "#000000";
  const colors = new Set<string>();
  const highlights = new Set<string>();

  function add(node: Node) {
    colors.add(read(inlineValue(editor, node, "color") ?? getComputedStyle(editor).color) ?? fallback);
    let el = node.nodeType === Node.TEXT_NODE ? node.parentElement : node as HTMLElement;
    let highlight: string | null = null;
    // 노트 자체의 배경과 글자에 입힌 배경을 구분한다. 투명한 자식은 부모의 색을 따른다.
    while (el && el !== editor && editor.contains(el)) {
      if (el.style.backgroundColor) highlight = read(getComputedStyle(el).backgroundColor);
      if (highlight) break;
      el = el.parentElement;
    }
    highlights.add(highlight ?? "");
  }

  const selection = window.getSelection();
  const range = selection?.rangeCount ? selection.getRangeAt(0) : null;
  if (range && !range.collapsed) {
    const walker = document.createTreeWalker(editor, NodeFilter.SHOW_TEXT);
    let node: Node | null;
    while ((node = walker.nextNode())) {
      if (!node.textContent?.length || !range.intersectsNode(node)) continue;
      const part = document.createRange();
      part.selectNodeContents(node);
      if (range.compareBoundaryPoints(Range.START_TO_START, part) > 0) part.setStart(range.startContainer, range.startOffset);
      if (range.compareBoundaryPoints(Range.END_TO_END, part) < 0) part.setEnd(range.endContainer, range.endOffset);
      if (!part.collapsed) add(node);
    }
  }
  if (!colors.size) {
    let node = range?.startContainer ?? editor;
    if (node.nodeType !== Node.TEXT_NODE) {
      const next = node.childNodes[range?.startOffset ?? 0];
      node = next ?? node.lastChild ?? node;
      while (node.nodeType !== Node.TEXT_NODE && (next ? node.firstChild : node.lastChild)) {
        node = (next ? node.firstChild : node.lastChild)!;
      }
    }
    add(editor.contains(node) ? node : editor);
  }
  // 커서만 있을 때 execCommand는 DOM을 바꾸지 않고 다음 입력의 색만 바꿀 수 있다.
  if (range?.collapsed && editor.contains(range.startContainer)) {
    try {
      const value = document.queryCommandValue("foreColor");
      if (value) { colors.clear(); colors.add(read(value) ?? ""); }
    } catch {
      // 지원하지 않는 브라우저에서는 커서 주변의 저장된 서식을 사용한다.
    }
  }
  const result = (values: Set<string>): SelectionColor => values.size > 1
    ? { kind: "mixed" }
    : [...values][0] ? { kind: "color", value: [...values][0] } : { kind: "none" };
  return { color: result(colors), highlight: result(highlights) };
}

export function readFormatState(editor: HTMLElement): FormatState {
  const on: Record<string, boolean> = {};
  for (const command of STATE_COMMANDS) {
    try {
      on[command] = document.queryCommandState(command);
    } catch {
      // 브라우저가 모르는 명령이면 꺼진 것으로 둔다.
      on[command] = false;
    }
  }

  const node = window.getSelection()?.anchorNode ?? null;

  const family = inlineValue(editor, node, "fontFamily");
  const font =
    FONT_OPTIONS.find(
      (option) => family && normalize(option.value) === normalize(family),
    )?.value ?? DEFAULT_FONT;

  const px = inlineValue(editor, node, "fontSize")?.replace("px", "").trim();
  // 서식 메뉴가 넣은 크기는 언제나 목록 안에 있다. 붙여넣기로 들어온 낯선
  // 값이면 기본 크기로 보여 준다.
  const size = px && SIZE_OPTIONS.includes(px as never) ? px : DEFAULT_SIZE;

  return { on, font, size, ...selectionColors(editor) };
}
