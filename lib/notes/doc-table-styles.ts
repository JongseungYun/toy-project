/** 편집·공유·내보내기에 같은 표 경계와 가로 스크롤을 제공한다. */
export const DOC_TABLE_STYLES = `
  .doc-tables table {
    display: block; width: 100%; max-width: 100%; overflow-x: auto;
    border-collapse: collapse; margin: 1rem 0;
  }
  .doc-tables table > tbody { display: table; width: 100%; }
  .doc-tables th, .doc-tables td {
    min-width: 6rem; max-width: 24rem; padding: .5rem .75rem;
    border: 1px solid var(--border, #cbd5e1);
    text-align: left; vertical-align: top; overflow-wrap: anywhere;
  }
  .doc-tables th { font-weight: 600; background: var(--muted, #f1f5f9); }
`;
