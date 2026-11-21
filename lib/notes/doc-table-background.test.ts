import { describe, expect, it } from "vitest";
import { clearWhiteHeaderBackgrounds, normalizeTableHeaderHtml } from "./doc-table-background";
import { backupHtml } from "./backup-html";

describe("표 머리글과 크기 보존", () => {
  it("기존 머리글의 흰 배경만 지우며 다른 강조색·글자 크기·본문 배경은 유지한다", () => {
    const html = '<table><tbody><tr><th><span style="background-color: rgb(255, 255, 255); font-size: 14px">제목</span><span style="background-color:yellow">강조</span></th></tr><tr><td><span style="background-color:white">본문</span></td></tr></tbody></table>';
    const editor = document.createElement("div");
    editor.innerHTML = normalizeTableHeaderHtml(html);
    expect(editor.querySelector<HTMLElement>("th span")?.style.backgroundColor).toBe("");
    expect(editor.querySelector<HTMLElement>("th span")?.style.fontSize).toBe("14px");
    expect(editor.querySelector<HTMLElement>("th span + span")?.style.backgroundColor).toBe("yellow");
    expect(editor.querySelector<HTMLElement>("td span")?.style.backgroundColor).toBe("white");
    expect(editor.textContent).toBe("제목강조본문");
  });

  it("입력 중인 셀의 DOM과 커서는 유지하고 흰색 배경만 지운다", () => {
    const editor = document.createElement("div");
    editor.innerHTML = '<table><tbody><tr><th><span style="background-color:#fff">글</span></th></tr></tbody></table>';
    const span = editor.querySelector("span")!;
    clearWhiteHeaderBackgrounds(editor);
    expect(editor.querySelector("span")).toBe(span);
    expect(span.style.backgroundColor).toBe("");
  });

  it("백업 복원에서 조절한 열 너비와 행 높이를 보존한다", () => {
    const html = '<table><tbody style="width:400px;table-layout:fixed"><tr style="height:80px"><td style="width:160px;min-width:160px;max-width:160px">가</td><td style="width:240px">나</td></tr></tbody></table>';
    const editor = document.createElement("div");
    editor.innerHTML = backupHtml(html);
    expect(editor.querySelector("tbody")?.style.tableLayout).toBe("fixed");
    expect(editor.querySelector("tr")?.style.height).toBe("80px");
    expect(editor.querySelector("td")?.style.width).toBe("160px");
  });
});
