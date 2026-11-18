export type TableAction = "rowBefore" | "rowAfter" | "columnBefore" | "columnAfter" | "deleteRow" | "deleteColumn" | "deleteTable";

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
  if (action === "rowBefore" || action === "rowAfter") {
    rowIndex += action === "rowAfter" ? 1 : 0;
    const added = table.insertRow(rowIndex);
    for (let index = 0; index < row.cells.length; index++) added.append(emptyCell());
  } else if (action === "columnBefore" || action === "columnAfter") {
    columnIndex += action === "columnAfter" ? 1 : 0;
    for (const tr of table.rows) {
      tr.insertBefore(emptyCell(tr.cells[0]?.tagName === "TH"), tr.cells[columnIndex] ?? null);
    }
  } else if (action === "deleteRow") {
    table.deleteRow(rowIndex);
    rowIndex = Math.min(rowIndex, table.rows.length - 1);
  } else if (action === "deleteColumn") {
    for (const tr of table.rows) tr.cells[columnIndex]?.remove();
    columnIndex = Math.max(0, columnIndex - 1);
  }
  const remove = action === "deleteTable" || !table.rows.length || !table.rows[0].cells.length;
  const marker = `table-${crypto.randomUUID()}`;
  table.id = marker;
  const range = document.createRange();
  range.selectNode(original);
  const selection = window.getSelection();
  selection?.removeAllRanges();
  selection?.addRange(range);
  document.execCommand("insertHTML", false, remove ? "<p><br></p>" : table.outerHTML);
  const inserted = editor.querySelector<HTMLTableElement>(`#${marker}`);
  inserted?.removeAttribute("id");
  const next = inserted?.rows[rowIndex]?.cells[columnIndex];
  if (next) selectStart(next);
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
