import { describe, expect, it } from "vitest";
import {
  FORMAT_LABEL,
  displayTitle,
  formatUpdatedAt,
  previewFromHtml,
  previewFromMarkdown,
} from "@/lib/notes/display";

describe("previewFromHtml", () => {
  it("태그를 걷어내고 본문 글만 남긴다", () => {
    expect(previewFromHtml("<h2>회의록</h2><p>참석: 윤종승</p>")).toBe(
      "회의록\n참석: 윤종승",
    );
  });

  it("블록마다 줄을 바꿔 미리보기에서도 문단이 보이게 한다", () => {
    expect(previewFromHtml("<li>대파</li><li>달걀</li>")).toBe("대파\n달걀");
  });

  it("HTML 엔티티를 원래 글자로 되돌린다", () => {
    expect(previewFromHtml("<p>A&nbsp;&amp;&nbsp;B</p>")).toBe("A & B");
  });

  it("너무 길면 앞부분만 남긴다", () => {
    expect(previewFromHtml(`<p>${"가".repeat(500)}</p>`)).toHaveLength(200);
  });

  it("빈 본문은 빈 문자열이 된다", () => {
    expect(previewFromHtml("<p><br></p>")).toBe("");
  });
});

describe("previewFromMarkdown", () => {
  it("원문을 그대로 두어 목록 미리보기가 Markdown처럼 보이게 한다", () => {
    expect(previewFromMarkdown("# 제목\n\n- 하나\n- 둘")).toBe(
      "# 제목\n\n- 하나\n- 둘",
    );
  });

  it("너무 길면 앞부분만 남긴다", () => {
    expect(previewFromMarkdown("가".repeat(500))).toHaveLength(200);
  });
});

describe("displayTitle", () => {
  it("제목을 입력했으면 그대로 쓴다", () => {
    expect(
      displayTitle({ title: "장보기", preview: "대파 2단", format: "doc" }),
    ).toBe("장보기");
  });

  it("제목이 비어 있으면 본문 첫 줄만 쓴다", () => {
    expect(
      displayTitle({
        title: "   ",
        preview: "대파 2단\n달걀 한 판",
        format: "doc",
      }),
    ).toBe("대파 2단");
  });

  it("Markdown이면 첫 줄의 기호를 떼고 쓴다", () => {
    expect(
      displayTitle({
        title: "",
        preview: "# React 19 Server Components 정리\n\n## 왜 쓰는가",
        format: "markdown",
      }),
    ).toBe("React 19 Server Components 정리");
    expect(
      displayTitle({ title: "", preview: "- 첫 항목\n- 둘째", format: "markdown" }),
    ).toBe("첫 항목");
    expect(
      displayTitle({ title: "", preview: "> 인용부터 시작", format: "markdown" }),
    ).toBe("인용부터 시작");
  });

  it("그림판이면 그림에 적힌 첫 글을 쓴다", () => {
    const preview = JSON.stringify([
      { id: "a", kind: "pen", points: [0, 0, 5, 5], color: "#000", width: 2 },
      { id: "b", kind: "text", x: 10, y: 20, text: "제주공항 도착", color: "#000", size: 17 },
    ]);
    expect(displayTitle({ title: "", preview, format: "canvas" })).toBe(
      "제주공항 도착",
    );
  });

  it("그림에 글이 없으면 기본 이름을 쓴다. 저장된 값을 제목에 흘리지 않는다", () => {
    const preview = JSON.stringify([
      { id: "a", kind: "pen", points: [0, 0, 5, 5], color: "#000", width: 2 },
    ]);
    expect(displayTitle({ title: "", preview, format: "canvas" })).toBe(
      "제목 없는 그림판",
    );
  });

  it("본문 첫 줄이 길면 잘라서 쓴다", () => {
    expect(
      displayTitle({ title: "", preview: "가".repeat(120), format: "doc" }),
    ).toHaveLength(60);
  });

  it("뽑을 내용이 없으면 형식에 맞는 기본 이름을 쓴다", () => {
    expect(displayTitle({ title: "", preview: "", format: "doc" })).toBe(
      "제목 없는 일반 문서",
    );
    expect(displayTitle({ title: "", preview: "", format: "markdown" })).toBe(
      "제목 없는 Markdown 문서",
    );
    expect(displayTitle({ title: "", preview: "", format: "canvas" })).toBe(
      "제목 없는 그림판",
    );
  });
});

describe("formatUpdatedAt", () => {
  const now = new Date("2026-09-15T14:41:00+09:00");

  it("오늘이면 시각만 보여준다", () => {
    expect(formatUpdatedAt("2026-09-15T05:41:00Z", now)).toBe("오후 2:41");
  });

  it("어제면 어제라고 알린다", () => {
    expect(formatUpdatedAt("2026-09-14T05:41:00Z", now)).toBe("어제");
  });

  it("그보다 오래됐으면 날짜를 보여준다", () => {
    expect(formatUpdatedAt("2026-09-12T05:41:00Z", now)).toBe("9월 12일");
  });
});

describe("FORMAT_LABEL", () => {
  it("용어집의 형식 이름을 그대로 쓴다", () => {
    expect(FORMAT_LABEL).toEqual({
      doc: "일반 문서",
      markdown: "Markdown",
      canvas: "그림판",
    });
  });
});
