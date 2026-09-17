// 일반 문서의 서식. contentEditable 위에서 브라우저가 제공하는 편집 명령을 쓰고,
// 결과는 인라인 style로 남아 그대로 저장된다.

export const FONT_OPTIONS = [
  { label: "본고딕", value: "'Noto Sans KR', 'Malgun Gothic', sans-serif" },
  { label: "나눔명조", value: "'Nanum Myeongjo', 'Batang', serif" },
  { label: "Georgia", value: "Georgia, serif" },
  { label: "코드용 고정폭", value: "var(--font-geist-mono), monospace" },
] as const;

export const SIZE_OPTIONS = ["14", "15", "17", "20", "24"] as const;

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
