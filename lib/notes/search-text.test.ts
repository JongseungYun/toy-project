import { describe, expect, it } from "vitest";
import { searchableText } from "./search-text";

describe("노트 본문 검색", () => {
  it("일반 문서의 서식 태그를 제외하고 본문 끝까지 읽는다", () => {
    const text = searchableText("doc", {
      html: `<p>${"앞부분 ".repeat(100)}</p><p><b>회의</b> 준비 &amp; &#xC77C;&#51221;</p><p style="color:red">내일</p>`,
    });
    expect(text).toContain("회의 준비 & 일정 내일");
    expect(text).not.toContain("style");
    expect(text).not.toContain("color:red");
  });

  it("Markdown의 표시되는 글과 코드를 찾고 주소·이미지 설명·서식 기호는 제외한다", () => {
    const text = searchableText("markdown", {
      source: "# **회의** 준비\n\n[기록](https://hidden.example) ![숨긴사진](image.png)\n\n```js\nconst 일정 = 1;\n```\n\n| 항목 | 날짜 |\n| --- | --- |\n| 공부 | 내일 |",
      viewer: true,
    });
    expect(text).toBe("회의 준비 기록 const 일정 = 1; 항목 날짜 공부 내일");
  });

  it("그림판의 두 번째 이후 글상자도 찾고 좌표·색상·도형은 제외한다", () => {
    const text = searchableText("canvas", { elements: [
      { id: "a", kind: "text", x: 1, y: 2, text: "첫 글상자", color: "#000000", size: 20 },
      { id: "b", kind: "text", x: 3, y: 4, text: "두 번째 일정", color: "#111111", size: 20 },
    ] });
    expect(text).toBe("첫 글상자 두 번째 일정");
  });

  it("Markdown에 HTML로 쓴 문장의 글은 남기고 태그·속성은 제외한다", () => {
    expect(searchableText("markdown", { source: '<div style="color:red">회의 일정</div>', viewer: true })).toBe("회의 일정");
  });
});
