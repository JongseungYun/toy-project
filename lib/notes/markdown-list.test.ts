import { describe, expect, it } from "vitest";
import { markdownListEdit } from "./markdown-list";

describe("Markdown 목록의 Enter", () => {
  it.each([
    ["- 한 줄", "\n- "], ["+ 한 줄", "\n+ "], ["* 한 줄", "\n* "],
    ["09) 아홉", "\n10) "], ["9. 아홉", "\n10. "],
    ["- 부모\n    * [X] 확인", "\n    * [ ] "],
  ])("현재 항목의 기호와 들여쓰기를 잇는다 (%s)", (source, text) => {
    expect(markdownListEdit(source, source.length, source.length)).toEqual({ start: source.length, end: source.length, text });
  });
  it("빈 체크 항목은 현재 줄의 접두어만 지운다", () => {
    expect(markdownListEdit("- 부모\n  - [ ] \n뒤", 13, 13)).toEqual({ start: 5, end: 13, text: "" });
    expect(markdownListEdit("- [ ]", 5, 5)).toEqual({ start: 0, end: 5, text: "" });
    expect(markdownListEdit("-", 1, 1)).toEqual({ start: 0, end: 1, text: "" });
  });
  it.each(["일반 문단", "```md\n- 예제", "~~~\n1. 예제", "    - 들여쓴 코드", "- - -", "문장\n2. 계속"])(
    "목록처럼 보이는 다른 블록에서는 개입하지 않는다 (%s)", (source) => {
      expect(markdownListEdit(source, source.length, source.length)).toBeNull();
    },
  );
  it("선택 영역과 기호 안쪽은 브라우저의 줄바꿈에 맡긴다", () => {
    expect(markdownListEdit("- abc", 2, 4)).toBeNull();
    expect(markdownListEdit("- abc", 1, 1)).toBeNull();
  });
});
