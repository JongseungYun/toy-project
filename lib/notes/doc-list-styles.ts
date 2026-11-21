/** 편집·공유·HTML 내보내기에서 같은 글머리 순환을 사용한다. */
export const DOC_LIST_STYLES = `
  .doc-list-markers li[data-task] { position: relative; list-style-type: none; }
  .doc-list-markers li[data-task]::before {
    content: "☐"; position: absolute; left: -1.5rem; width: 1.5rem;
    text-align: center; font-family: system-ui, sans-serif;
  }
  .doc-list-markers li[data-task="done"]::before { content: "☑"; }
  .doc-list-markers[contenteditable] li[data-task]::before { cursor: pointer; }
  .doc-list-markers a[href] { text-decoration: underline; }
  .doc-list-markers { --note-bullet: initial; }
  .doc-list-markers ul {
    --note-bullet: disc;
    list-style-type: var(--note-bullet);
    padding-left: 1.5rem;
  }
  @container style(--note-bullet: disc) {
    .doc-list-markers ul { --note-bullet: circle; }
  }
  @container style(--note-bullet: circle) {
    .doc-list-markers ul { --note-bullet: square; }
  }
  @container style(--note-bullet: square) {
    .doc-list-markers ul { --note-bullet: disc; }
  }
`;
