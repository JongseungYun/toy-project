import { describe, expect, it } from "vitest";
import { normalizeDocHtml, plainTextHtml } from "@/lib/notes/doc-formatting";

describe("일반 문서 붙여넣기", () => {
  it("외부 목록의 배경과 여백은 제외하고 글자 서식과 구조는 유지한다", () => {
    const html = normalizeDocHtml('<ul class="external" style="background:#181818;padding:32px;color:#ccc"><li><strong>PR 상태:</strong> 확인</li><li><span style="background:#ffeb3b;font-size:20px">강조</span><br>다음 줄</li></ul>');
    const root = document.createElement("div");
    root.innerHTML = html;
    expect(root.querySelector("ul")?.getAttribute("style")).toBeNull();
    expect(root.querySelector("[class]")).toBeNull();
    expect(root.querySelectorAll("li")).toHaveLength(2);
    expect(root.querySelector("strong")?.textContent).toBe("PR 상태:");
    expect(root.querySelector('span[style*="background-color"]')?.textContent).toBe("강조");
    expect(root.querySelector('span[style*="font-size"]')?.getAttribute("style")).toContain("20px");
    expect(root.querySelectorAll("br")).toHaveLength(1);
  });

  it("코드의 개행을 유지하고 지원하지 않는 스타일과 실행 요소는 제외한다", () => {
    const html = normalizeDocHtml('<pre style="background:black;position:fixed;font-size:99px">첫 줄\n  둘째 줄</pre><script>bad()</script>');
    expect(html).toBe("<div>첫 줄<br>  둘째 줄</div>");
  });

  it("서식을 지워도 목록과 줄바꿈, 글은 남긴다", () => {
    expect(normalizeDocHtml('<ul style="background:black"><li><b>굵게</b><br><span style="color:red">색</span></li></ul>', true)).toBe("<ul><li>굵게<br>색</li></ul>");
  });

  it("서식 없는 텍스트는 HTML 문자가 글로 들어가고 줄바꿈이 유지된다", () => {
    expect(plainTextHtml("<b>그대로</b>\n다음 줄")).toBe("&lt;b&gt;그대로&lt;/b&gt;<br>다음 줄");
  });
});
