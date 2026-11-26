import { describe, expect, it } from "vitest";
import { backupHtml } from "./backup-html";
import { normalizeDocHtml } from "./doc-formatting";
import { webAddress } from "./web-address";

describe("체크리스트와 링크", () => {
  const html = '<ul><li data-task="done"><a href="https://example.com/issue">검토</a></li><li data-task="open">배포</li></ul>';
  it("복사·붙여넣기와 백업 복원에서 항목 상태와 링크 주소를 유지한다", () => {
    expect(normalizeDocHtml(html)).toBe(html);
    expect(backupHtml(html)).toBe(html);
  });
  it("HTTP와 HTTPS 주소를 인식하고 잘못된 주소의 글은 일반 텍스트로 붙인다", () => {
    expect(webAddress(" https://example.com ")).toBe("https://example.com/");
    expect(webAddress("잘못된 주소")).toBeNull();
    expect(normalizeDocHtml('<a href="other:abc">글</a>')).toBe("글");
  });
});
