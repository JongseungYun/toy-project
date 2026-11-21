export function webAddress(value: string): string | null {
  try {
    const url = new URL(value.trim());
    return ["http:", "https:"].includes(url.protocol) ? url.href : null;
  } catch {
    return null;
  }
}

export function rangeElement(range?: Range | null) {
  const node = range?.startContainer;
  return node instanceof Element ? node : node?.parentElement;
}

export function editorRange(editor: HTMLElement) {
  const selection = window.getSelection();
  const range = selection?.rangeCount ? selection.getRangeAt(0) : null;
  return range && editor.contains(range.commonAncestorContainer) ? range : null;
}

export function toggleChecklist(editor: HTMLElement) {
  let range = editorRange(editor);
  if (!range) return;
  const list = rangeElement(range)?.closest("ul");
  let created: HTMLLIElement[] = [];
  if (!list?.contains(range.endContainer)) {
    const existing = new Set(editor.querySelectorAll("li"));
    document.execCommand("insertUnorderedList");
    created = Array.from(editor.querySelectorAll("li")).filter(li => !existing.has(li));
    range = editorRange(editor);
  }
  if (!range) return;
  const item = rangeElement(range)?.closest("li");
  let items = range.collapsed && item
    ? [item]
    : Array.from(editor.querySelectorAll("li")).filter(li => range.intersectsNode(li));
  if (!items.length && created.length) {
    items = created;
    range.selectNodeContents(items[0]);
    range.collapse(true);
    const selection = window.getSelection();
    selection?.removeAllRanges();
    selection?.addRange(range);
  }
  const remove = items.length && items.every(li => li.hasAttribute("data-task"));
  for (const li of items) {
    if (remove) li.removeAttribute("data-task");
    else if (!li.hasAttribute("data-task")) li.dataset.task = "open";
  }
}

export function toggleTask(item: HTMLElement) {
  item.dataset.task = item.dataset.task === "done" ? "open" : "done";
}

export function changeLink(editor: HTMLElement, address: string | null) {
  const range = editorRange(editor);
  if (!range) return;
  const link = rangeElement(range)?.closest("a");
  if (link && link.contains(range.endContainer)) {
    range.selectNodeContents(link);
    window.getSelection()!.removeAllRanges();
    window.getSelection()!.addRange(range);
  }
  if (address === null) { document.execCommand("unlink"); return; }
  const href = webAddress(address);
  if (!href) return;
  if (range.collapsed) {
    const anchor = document.createElement("a");
    anchor.href = href;
    anchor.textContent = address;
    document.execCommand("insertHTML", false, anchor.outerHTML);
  } else document.execCommand("createLink", false, href);
}
