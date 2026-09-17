import { describe, expect, it } from "vitest";
import { SORT_OPTIONS, resolveSort, toggleDirection } from "@/lib/notes/sort";

describe("resolveSort", () => {
  it("아무것도 고르지 않았으면 수정일 최신순이다", () => {
    expect(resolveSort({})).toEqual({ key: "updated", ascending: false });
  });

  it("고른 기준과 방향을 그대로 쓴다", () => {
    expect(resolveSort({ sort: "title", dir: "asc" })).toEqual({
      key: "title",
      ascending: true,
    });
    expect(resolveSort({ sort: "updated", dir: "asc" })).toEqual({
      key: "updated",
      ascending: true,
    });
  });

  it("방향을 고르지 않았으면 기준마다 자연스러운 쪽을 쓴다", () => {
    // 날짜는 최신이 위로, 제목은 가나다순이 위로 오는 것이 화면 문구와 맞다.
    expect(resolveSort({ sort: "title" })).toEqual({
      key: "title",
      ascending: true,
    });
    expect(resolveSort({ sort: "created" })).toEqual({
      key: "created",
      ascending: false,
    });
  });

  it("모르는 값은 기본값으로 되돌린다", () => {
    expect(resolveSort({ sort: "somethingelse", dir: "sideways" })).toEqual({
      key: "updated",
      ascending: false,
    });
  });
});

describe("toggleDirection", () => {
  it("내림차순과 오름차순을 오간다", () => {
    expect(toggleDirection(false)).toBe("asc");
    expect(toggleDirection(true)).toBe("desc");
  });
});

describe("SORT_OPTIONS", () => {
  it("스펙이 정한 세 가지 기준을 가진다", () => {
    expect(SORT_OPTIONS.map((option) => option.value)).toEqual([
      "updated",
      "created",
      "title",
    ]);
  });
});
