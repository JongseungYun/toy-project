import { describe, expect, it } from "vitest";
import { sanitizeHtml } from "@/lib/notes/sanitize";

describe("sanitizeHtml", () => {
  it("서식은 그대로 둔다", () => {
    const html =
      '<p style="font-family: Georgia, serif; font-size: 20px"><b>굵게</b> 그리고 <span style="color: #b3123f">색</span></p>';
    expect(sanitizeHtml(html)).toBe(html);
  });

  it("목록과 정렬도 손대지 않는다", () => {
    const html = '<ul><li style="text-align: center">하나</li><li>둘</li></ul>';
    expect(sanitizeHtml(html)).toBe(html);
  });

  it("script는 안에 든 것까지 지운다", () => {
    const html = '<p>앞</p><script>alert("x")</script><p>뒤</p>';
    expect(sanitizeHtml(html)).toBe("<p>앞</p><p>뒤</p>");
  });

  it("닫는 짝이 없는 script도 남기지 않는다", () => {
    expect(sanitizeHtml('<p>앞</p><script src="evil.js">')).toBe("<p>앞</p>");
  });

  it("이벤트 속성을 걷어 낸다", () => {
    expect(sanitizeHtml('<p onclick="steal()">글</p>')).toBe("<p>글</p>");
    expect(sanitizeHtml("<p ONERROR=steal()>글</p>")).toBe("<p>글</p>");
  });

  it("javascript: 주소를 걷어 낸다", () => {
    expect(sanitizeHtml('<a href="javascript:steal()">링크</a>')).toBe(
      "<a>링크</a>",
    );
  });

  it("보통 링크는 그대로 둔다", () => {
    const html = '<a href="https://example.com">링크</a>';
    expect(sanitizeHtml(html)).toBe(html);
  });

  it("iframe과 style 블록을 지운다", () => {
    expect(sanitizeHtml('<iframe src="https://evil.test"></iframe><p>글</p>')).toBe(
      "<p>글</p>",
    );
    expect(sanitizeHtml("<style>body{display:none}</style><p>글</p>")).toBe(
      "<p>글</p>",
    );
  });
});
