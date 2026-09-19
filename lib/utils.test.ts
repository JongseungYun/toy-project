import { describe, expect, it } from "vitest";

import { cn, escapeHtml } from "@/lib/utils";

describe("cn", () => {
  it("조건부 클래스 중 참인 값만 남긴다", () => {
    expect(cn("px-2", false && "hidden", "text-sm")).toBe("px-2 text-sm");
  });

  it("충돌하는 Tailwind 유틸리티는 뒤에 온 값으로 병합한다", () => {
    expect(cn("px-2", "px-4")).toBe("px-4");
  });
});

describe("escapeHtml", () => {
  it("태그로 읽힐 수 있는 글자를 바꾼다", () => {
    expect(escapeHtml('<b>"조사" & 정리</b>')).toBe(
      "&lt;b&gt;&quot;조사&quot; &amp; 정리&lt;/b&gt;",
    );
  });

  it("보통 글자는 그대로 둔다", () => {
    expect(escapeHtml("회의록 2026-09")).toBe("회의록 2026-09");
  });
});
