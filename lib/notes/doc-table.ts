export type TableAction = "rowBefore" | "rowAfter" | "columnBefore" | "columnAfter" | "deleteRow" | "deleteColumn" | "deleteTable";
export const MIN_COLUMN_WIDTH = 64;
export const MIN_ROW_HEIGHT = 32;

export function selectedTableCell(editor: HTMLElement): HTMLTableCellElement | null {
  const selection = window.getSelection();
  const node = selection?.anchorNode;
  const cell = (node instanceof Element ? node : node?.parentElement)?.closest("td, th");
  return cell instanceof HTMLTableCellElement && editor.contains(cell) ? cell : null;
}

function selectStart(element: Element) {
  const range = document.createRange();
  range.selectNodeContents(element);
  range.collapse(true);
  const selection = window.getSelection();
  selection?.removeAllRanges();
  selection?.addRange(range);
}

function emptyCell(header = false) {
  const cell = document.createElement(header ? "th" : "td");
  cell.innerHTML = "<br>";
  return cell;
}

function replaceTable(editor: HTMLElement, original: HTMLTableElement, table: HTMLTableElement | null, rowIndex: number, columnIndex: number) {
  const marker = `table-${crypto.randomUUID()}`;
  if (table) table.id = marker;
  const range = document.createRange();
  range.selectNode(original);
  const selection = window.getSelection();
  selection?.removeAllRanges();
  selection?.addRange(range);
  document.execCommand("insertHTML", false, table ? table.outerHTML : "<p><br></p>");
  const inserted = editor.querySelector<HTMLTableElement>(`#${marker}`);
  inserted?.removeAttribute("id");
  const next = inserted?.rows[rowIndex]?.cells[columnIndex];
  if (next) selectStart(next);
}

function setColumnWidths(table: HTMLTableElement, widths: number[]) {
  // 본문보다 넓으면 표 안에서 스크롤하며 각 열의 지정 너비는 유지한다.
  for (const section of Array.from(table.children)) {
    if (section instanceof HTMLTableSectionElement) {
      section.style.width = `${widths.reduce((sum, width) => sum + width, 0)}px`;
      section.style.tableLayout = "fixed";
    }
  }
  for (const row of table.rows) {
    Array.from(row.cells).forEach((cell, index) => {
      cell.style.width = `${widths[index]}px`;
      cell.style.minWidth = `${widths[index]}px`;
      cell.style.maxWidth = `${widths[index]}px`;
    });
  }
}

export function resizeDocTable(editor: HTMLElement, original: HTMLTableElement, rowIndex: number, columnIndex: number, size: { width?: number; height?: number }) {
  if (!editor.contains(original)) return;
  const table = original.cloneNode(true) as HTMLTableElement;
  if (size.width !== undefined && Number.isFinite(size.width)) {
    const widths = Array.from(original.rows[0].cells, (cell) => cell.getBoundingClientRect().width);
    widths[columnIndex] = Math.max(MIN_COLUMN_WIDTH, Math.round(size.width));
    setColumnWidths(table, widths);
  }
  if (size.height !== undefined && Number.isFinite(size.height)) {
    table.rows[rowIndex].style.height = `${Math.max(MIN_ROW_HEIGHT, Math.round(size.height))}px`;
  }
  editor.focus();
  replaceTable(editor, original, table, rowIndex, columnIndex);
}

export function resizeSelectedTableCell(editor: HTMLElement, width: number, height: number) {
  const cell = selectedTableCell(editor);
  const table = cell?.closest("table");
  if (cell && table) resizeDocTable(editor, table, (cell.parentElement as HTMLTableRowElement).rowIndex, cell.cellIndex, { width, height });
}

export function insertDocTable(editor: HTMLElement, rows: number, columns: number) {
  if (selectedTableCell(editor) || !Number.isInteger(rows) || !Number.isInteger(columns)
    || rows < 1 || rows > 20 || columns < 1 || columns > 10) return;
  const table = document.createElement("table");
  const body = table.createTBody();
  for (let row = 0; row < rows; row++) {
    const tr = body.insertRow();
    for (let column = 0; column < columns; column++) tr.append(emptyCell(row === 0));
  }
  // insertHTML을 사용해야 기존 글 입력과 같은 브라우저 되돌리기 이력에 남는다.
  const marker = `table-${crypto.randomUUID()}`;
  table.id = marker;
  document.execCommand("insertHTML", false, `${table.outerHTML}<p><br></p>`);
  const inserted = editor.querySelector<HTMLTableElement>(`#${marker}`);
  inserted?.removeAttribute("id");
  if (inserted?.rows[0]?.cells[0]) selectStart(inserted.rows[0].cells[0]);
}

/** 표 하나만 교체하므로 주변 문단과 다른 표는 편집 이력까지 그대로 남는다. */
export function editDocTable(editor: HTMLElement, action: TableAction) {
  const cell = selectedTableCell(editor);
  const original = cell?.closest("table");
  if (!cell || !original) return;
  const table = original.cloneNode(true) as HTMLTableElement;
  let rowIndex = (cell.parentElement as HTMLTableRowElement).rowIndex;
  let columnIndex = cell.cellIndex;
  const row = table.rows[rowIndex];
  const widths = Array.from(original.rows[0].cells, (cell) => cell.getBoundingClientRect().width);
  const hasWidths = Boolean(table.tBodies[0]?.style.width);
  if (action === "rowBefore" || action === "rowAfter") {
    rowIndex += action === "rowAfter" ? 1 : 0;
    const added = table.insertRow(rowIndex);
    for (let index = 0; index < row.cells.length; index++) added.append(emptyCell());
  } else if (action === "columnBefore" || action === "columnAfter") {
    columnIndex += action === "columnAfter" ? 1 : 0;
    widths.splice(columnIndex, 0, 96);
    for (const tr of table.rows) {
      tr.insertBefore(emptyCell(tr.cells[0]?.tagName === "TH"), tr.cells[columnIndex] ?? null);
    }
  } else if (action === "deleteRow") {
    table.deleteRow(rowIndex);
    rowIndex = Math.min(rowIndex, table.rows.length - 1);
  } else if (action === "deleteColumn") {
    widths.splice(columnIndex, 1);
    for (const tr of table.rows) tr.cells[columnIndex]?.remove();
    columnIndex = Math.max(0, columnIndex - 1);
  }
  const remove = action === "deleteTable" || !table.rows.length || !table.rows[0].cells.length;
  if (!remove && hasWidths) setColumnWidths(table, widths);
  replaceTable(editor, original, remove ? null : table, rowIndex, columnIndex);
}

/** 셀 안에서는 Tab/Shift+Tab으로 이동하고, 마지막 셀의 Tab은 행을 추가한다. */
export function moveTableCell(editor: HTMLElement, backwards: boolean): boolean {
  const cell = selectedTableCell(editor);
  const table = cell?.closest("table");
  if (!cell || !table) return false;
  const cells = Array.from(table.rows).flatMap((row) => Array.from(row.cells));
  const next = cells[cells.indexOf(cell) + (backwards ? -1 : 1)];
  if (next) selectStart(next);
  else if (!backwards) {
    editDocTable(editor, "rowAfter");
    const added = selectedTableCell(editor)?.parentElement as HTMLTableRowElement | null;
    if (added?.cells[0]) selectStart(added.cells[0]);
  }
  return true;
}
