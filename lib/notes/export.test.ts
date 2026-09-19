import { describe, expect, it } from "vitest";
import {
  buildExport,
  canvasDocument,
  docDocument,
  exportFileName,
} from "@/lib/notes/export";

describe("exportFileName", () => {
  it("형식마다 제 확장자를 붙인다", () => {
    expect(exportFileName("회의록", "doc")).toBe("회의록.html");
    expect(exportFileName("회의록", "markdown")).toBe("회의록.md");
    expect(exportFileName("회의록", "canvas")).toBe("회의록.svg");
  });

  it("파일 이름이 될 수 없는 글자를 바꾼다", () => {
    expect(exportFileName("2026/03 계획: 초안", "markdown")).toBe(
      "2026 03 계획 초안.md",
    );
  });

  it("제목이 비었으면 note로 둔다", () => {
    expect(exportFileName("   ", "doc")).toBe("note.html");
  });

  it("아주 긴 제목은 잘라 쓴다", () => {
    const name = exportFileName("가".repeat(100), "doc");
    expect(name).toBe(`${"가".repeat(60)}.html`);
  });
});

describe("docDocument", () => {
  it("본문을 그대로 담고 제목만 글자로 바꾼다", () => {
    const html = '<p style="font-size: 20px">본문 & 서식</p>';
    const file = docDocument("<계획>", html);

    expect(file).toContain("<title>&lt;계획&gt;</title>");
    expect(file).toContain(html);
    expect(file).toContain('<meta charset="utf-8">');
  });
});

describe("canvasDocument", () => {
  it("그림면 크기 그대로 SVG에 담는다", () => {
    const file = canvasDocument('<polyline points="1,2 3,4"/>');

    expect(file).toContain('xmlns="http://www.w3.org/2000/svg"');
    expect(file).toContain('viewBox="0 0 620 400"');
    expect(file).toContain('<polyline points="1,2 3,4"/>');
  });
});

describe("buildExport", () => {
  it("Markdown은 원문 그대로 담는다", () => {
    const file = buildExport("markdown", "메모", { source: "# 제목", viewer: true });

    expect(file.name).toBe("메모.md");
    expect(file.mime).toContain("text/markdown");
    expect(file.body).toBe("# 제목");
  });

  it("일반 문서는 서식이 살아 있는 HTML로 담는다", () => {
    const file = buildExport("doc", "메모", {
      html: '<p style="font-size: 20px">본문</p>',
    });

    expect(file.name).toBe("메모.html");
    expect(file.body).toContain('<p style="font-size: 20px">본문</p>');
  });

  it("그림판은 화면과 같은 도형을 SVG로 담는다", () => {
    const file = buildExport("canvas", "그림", {
      elements: [
        { id: "a", kind: "pen", points: [0, 0, 10, 10], color: "#2b2b2b", width: 2 },
        { id: "b", kind: "text", x: 5, y: 9, text: "가 & 나", color: "#2b2b2b", size: 16 },
      ],
    });

    expect(file.name).toBe("그림.svg");
    expect(file.body).toContain('<polyline points="0,0 10,10"');
    expect(file.body).toContain('stroke-width="2"');
    expect(file.body).toContain("가 &amp; 나</text>");
  });

  it("읽을 수 없는 그림은 빈 그림면으로 둔다", () => {
    const file = buildExport("canvas", "그림", { elements: "망가진 값" });
    expect(file.body).toContain("<svg");
  });
});
