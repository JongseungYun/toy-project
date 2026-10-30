import { expect, it } from "vitest";
import { matchRanges, normalizeSearchText, searchExcerpt } from "./search";

it("영문 대소문자를 무시하며 정규식·SQL 기호를 문자 그대로 강조한다", () => {
  expect(matchRanges("앞 NeEdLe_%[]' & 뒤", "needle_%[]' &")).toEqual([{ start: 2, end: 15 }]);
  expect(matchRanges("무관한 글", "%")).toEqual([]);
  expect(matchRanges("무관한 글", ".*")).toEqual([]);
});

it("문단 공백과 한글 정규화를 맞추고 공백뿐인 검색은 비운다", () => {
  expect(normalizeSearchText("  회의\n\n 준비\t완료  ")).toBe("회의 준비 완료");
  expect(normalizeSearchText("한글".normalize("NFD"))).toBe("한글");
  expect(matchRanges("아무 글", " \n ")).toEqual([]);
});

it("본문 앞부분 대신 일치한 뒷부분을 발췌하고 긴 검색어도 자르지 않는다", () => {
  const phrase = "찾는 문구".repeat(40);
  const text = `${"앞".repeat(500)}${phrase}${"뒤".repeat(500)}`;
  expect(searchExcerpt(text, phrase)).toContain(phrase);
  expect(searchExcerpt(text, phrase)).toMatch(/^…앞{16}/);
});
