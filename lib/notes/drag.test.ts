import { describe, expect, it } from "vitest";
import { NOTE_DRAG_TYPE, carriesNote, noteIdFrom } from "@/lib/notes/drag";

function transfer(types: string[], values: Record<string, string> = {}) {
  return {
    types,
    getData: (type: string) => values[type] ?? "",
  };
}

describe("carriesNote", () => {
  it("우리 노트를 끌고 있을 때만 참이다", () => {
    expect(carriesNote(transfer([NOTE_DRAG_TYPE]))).toBe(true);
    expect(carriesNote(transfer(["text/plain", NOTE_DRAG_TYPE]))).toBe(true);
  });

  it("밖에서 끌어온 파일과 글은 받지 않는다", () => {
    expect(carriesNote(transfer(["Files"]))).toBe(false);
    expect(carriesNote(transfer(["text/uri-list"]))).toBe(false);
    expect(carriesNote(null)).toBe(false);
  });
});

describe("noteIdFrom", () => {
  it("담아 둔 id를 돌려준다", () => {
    const payload = transfer([NOTE_DRAG_TYPE], { [NOTE_DRAG_TYPE]: "note-1" });
    expect(noteIdFrom(payload)).toBe("note-1");
  });

  it("id가 비어 있으면 null이다", () => {
    const payload = transfer([NOTE_DRAG_TYPE], { [NOTE_DRAG_TYPE]: "  " });
    expect(noteIdFrom(payload)).toBeNull();
  });

  it("우리 노트가 아니면 읽지 않는다", () => {
    expect(noteIdFrom(transfer(["text/plain"], { "text/plain": "note-1" }))).toBeNull();
  });
});
