import { describe, expect, it } from "vitest";
import { unified } from "unified";
import remarkParse from "remark-parse";
import { markdownLink } from "./markdown-link";

describe("Markdown 링크와 이미지 삽입", () => {
  const href = "https://example.com/a(b)?q=1&amp;x=2";
  const label = "문서 [초안] *검토* &amp;";
  const parse = (source: string) => unified().use(remarkParse).parse(source).children;
  it("특수 문자가 들어간 문구와 주소가 그대로 한 링크로 읽힌다", () => {
    expect(parse(markdownLink("link", label, href))).toMatchObject([
      { children: [{ type: "link", url: href, children: [{ type: "text", value: label }] }] },
    ]);
  });
  it("이미지 대체 텍스트에 포함된 기호를 보존한다", () => {
    expect(parse(markdownLink("image", label, href))).toMatchObject([
      { children: [{ type: "image", url: href, alt: label }] },
    ]);
  });
  it("문구를 비우면 링크는 주소를 표시하고 이미지는 빈 대체 텍스트를 쓴다", () => {
    expect(parse(markdownLink("link", "", href))).toMatchObject([{ children: [{ children: [{ value: href }] }] }]);
    expect(parse(markdownLink("image", "", href))).toMatchObject([{ children: [{ type: "image", alt: "" }] }]);
  });
});
