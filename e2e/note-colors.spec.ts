import { expect, test, type Page } from "@playwright/test";
import { createDocNote, signUpAndEnter } from "./support/account";
import { chooseDocColor } from "./support/doc-format";

const SAVED = { timeout: 20_000 };
const FIXTURE = '<p id="row"><span id="red" style="color:#b3123f;background-color:#fff59d;font-weight:700">빨간 글</span><span id="blue" style="color:#1d4ed8;background-color:#b2dfdb">파란 글</span><span id="plain">기본 글</span></p>';

async function seed(page: Page, html: string) {
  await page.getByTestId("note-body").evaluate((editor, content) => {
    editor.innerHTML = content;
    editor.dispatchEvent(new Event("input", { bubbles: true }));
  }, html);
}

test.beforeEach(async ({ page }) => {
  await signUpAndEnter(page);
  await createDocNote(page);
  await seed(page, FIXTURE);
});

async function selectText(page: Page, selector: string, from?: number, to?: number, backward = false) {
  await page.getByTestId("note-body").evaluate((editor, args) => {
    const node = editor.querySelector(args.selector)!;
    editor.focus();
    const range = document.createRange();
    range.selectNodeContents(node);
    if (args.from !== undefined) {
      const walker = document.createTreeWalker(node, NodeFilter.SHOW_TEXT);
      let text: Node | null;
      let seen = 0;
      let started = false;
      while ((text = walker.nextNode())) {
        const length = text.textContent!.length;
        if (!started && args.from <= seen + length) {
          range.setStart(text, args.from - seen);
          started = true;
        }
        const end = args.to ?? args.from;
        if (end <= seen + length) { range.setEnd(text, end - seen); break; }
        seen += length;
      }
    }
    const selection = window.getSelection()!;
    selection.removeAllRanges();
    if (args.backward) selection.setBaseAndExtent(range.endContainer, range.endOffset, range.startContainer, range.startOffset);
    else selection.addRange(range);
    document.dispatchEvent(new Event("selectionchange"));
  }, { selector, from, to, backward });
}

test("R11: 다른 색의 글을 선택하면 글자 색과 배경색 입력도 따라온다", async ({ page }) => {
  await selectText(page, "#blue");
  await expect(page.getByRole("button", { name: "글자 색", exact: true })).toHaveAttribute("data-color", "#1d4ed8");
  await expect(page.getByRole("button", { name: "글자 배경색", exact: true })).toHaveAttribute("data-color", "#b2dfdb");
  await page.getByRole("button", { name: "글자 색", exact: true }).click();
  await expect(page.getByRole("dialog", { name: "글자 색", exact: true }).getByLabel("색상 선택", { exact: true })).toHaveValue("#1d4ed8");
  await page.keyboard.press("Escape");
  await selectText(page, "#red");
  await expect(page.getByRole("button", { name: "글자 색", exact: true })).toHaveAttribute("data-color", "#b3123f");
  await expect(page.getByRole("button", { name: "글자 배경색", exact: true })).toHaveAttribute("data-color", "#fff59d");
  await expect(page.getByTestId("save-state")).toHaveAttribute("data-state", "saved", SAVED);
  await page.reload();
  await expect(page.getByTestId("note-body")).toBeVisible();
  await selectText(page, "#blue");
  await expect(page.getByRole("button", { name: "글자 색", exact: true })).toHaveAttribute("data-color", "#1d4ed8");
  await expect(page.getByRole("button", { name: "글자 배경색", exact: true })).toHaveAttribute("data-color", "#b2dfdb");
});

test("R11: 혼합 선택은 혼합으로 표시하고 적용하면 한 색으로 통일된다", async ({ page }) => {
  await selectText(page, "#row", undefined, undefined, true);
  const color = page.getByRole("button", { name: "글자 색", exact: true });
  const highlight = page.getByRole("button", { name: "글자 배경색", exact: true });
  await expect(color).toHaveAttribute("data-color-state", "mixed");
  await expect(highlight).toHaveAttribute("data-color-state", "mixed");
  await expect(color).toContainText("혼합");
  await chooseDocColor(page, "글자 색", "#008855");
  await expect(color).toHaveAttribute("data-color", "#008855");
  await expect(highlight).toHaveAttribute("data-color-state", "mixed");
  await highlight.click();
  const picker = page.getByRole("dialog", { name: "글자 배경색", exact: true });
  await expect(picker.getByLabel("색상 선택", { exact: true })).toHaveValue("#fff59d");
  // 후보와 같은 색을 골라도 적용 버튼은 실제 선택 영역에 반영한다.
  await picker.getByRole("button", { name: "적용", exact: true }).click();
  await expect(highlight).toHaveAttribute("data-color", "#fff59d");
  await expect(color).toHaveAttribute("data-color", "#008855");
  await expect(page.getByTestId("note-body")).toBeFocused();
  await expect(page.getByTestId("save-state")).toHaveAttribute("data-state", "saved", SAVED);
  await page.reload();
  await expect(page.getByTestId("note-body")).toBeVisible();
  await selectText(page, "#row");
  await expect(color).toHaveAttribute("data-color", "#008855");
  await expect(highlight).toHaveAttribute("data-color", "#fff59d");
});

test("R11: 같은 색 표기·부모 색·커서 위치를 읽고 경계의 다른 글은 섞지 않는다", async ({ page }) => {
  await seed(page, '<p id="same"><span style="color:#0055aa;background-color:#ffeecc">같은</span><span style="color:rgb(0,85,170);background-color:rgb(255,238,204)">색상</span></p><p id="parent" style="color:#008855;background-color:#b2dfdb"><span id="nested">부모 색</span></p><p><span id="empty">기본 글</span></p>');
  const color = page.getByRole("button", { name: "글자 색", exact: true });
  const highlight = page.getByRole("button", { name: "글자 배경색", exact: true });
  await selectText(page, "#same");
  await expect(color).toHaveAttribute("data-color", "#0055aa");
  await expect(highlight).toHaveAttribute("data-color", "#ffeecc");
  await selectText(page, "#nested", 1);
  await expect(color).toHaveAttribute("data-color", "#008855");
  await expect(highlight).toHaveAttribute("data-color", "#b2dfdb");
  await selectText(page, "#empty", 0);
  await expect(highlight).toHaveAttribute("data-color-state", "none");
  await expect(highlight).toContainText("없음");
  await seed(page, FIXTURE);
  await selectText(page, "#red", 4);
  await expect(color).toHaveAttribute("data-color", "#b3123f");
  await selectText(page, "#blue", 1);
  await expect(color).toHaveAttribute("data-color", "#1d4ed8");
});

test("R11: 색상 후보를 바꾸고 닫으면 본문과 현재 색은 바뀌지 않는다", async ({ page }) => {
  await selectText(page, "#red");
  const body = page.getByTestId("note-body");
  const before = await body.innerHTML();
  const color = page.getByRole("button", { name: "글자 색", exact: true });
  await color.click();
  await page.getByRole("dialog", { name: "글자 색", exact: true }).getByLabel("색상 선택", { exact: true }).fill("#00ff00");
  await page.keyboard.press("Escape");
  await expect(color).toHaveAttribute("data-color", "#b3123f");
  expect(await body.innerHTML()).toBe(before);
  await color.click();
  await expect(page.getByRole("dialog", { name: "글자 색", exact: true }).getByLabel("색상 선택", { exact: true })).toHaveValue("#b3123f");
  await body.locator("#red").click();
  await expect(body).toBeFocused();
  expect(await body.innerHTML()).toBe(before);
});

test("R11: 일부 배경색을 없애고 기본 글자 색으로 바꿔도 다른 서식과 글을 유지한다", async ({ page }) => {
  const color = page.getByRole("button", { name: "글자 색", exact: true });
  const highlight = page.getByRole("button", { name: "글자 배경색", exact: true });
  await selectText(page, "#plain");
  const defaultColor = await color.getAttribute("data-color");
  await selectText(page, "#red", 0, 2);
  await highlight.click();
  await page.getByRole("dialog", { name: "글자 배경색", exact: true }).getByRole("button", { name: "없음", exact: true }).click();
  await expect(highlight).toHaveAttribute("data-color-state", "none");
  await expect(color).toHaveAttribute("data-color", "#b3123f");
  await expect(page.getByRole("button", { name: "굵게", exact: true })).toHaveAttribute("aria-pressed", "true");
  await color.click();
  await page.getByRole("dialog", { name: "글자 색", exact: true }).getByRole("button", { name: "기본 색", exact: true }).click();
  await expect(color).toHaveAttribute("data-color", defaultColor!);
  await expect(page.getByRole("button", { name: "굵게", exact: true })).toHaveAttribute("aria-pressed", "true");
  await expect(page.getByTestId("note-body")).toHaveText("빨간 글파란 글기본 글");
  await selectText(page, "#row", 2, 4);
  await expect(color).toHaveAttribute("data-color", "#b3123f");
  await expect(highlight).toHaveAttribute("data-color", "#fff59d");
  await selectText(page, "#blue");
  await expect(color).toHaveAttribute("data-color", "#1d4ed8");
  await expect(highlight).toHaveAttribute("data-color", "#b2dfdb");
});

test("R11: 커서에서 고른 글자 색과 배경색을 다음 입력에도 함께 적용한다", async ({ page }) => {
  await selectText(page, "#blue", 1);
  await chooseDocColor(page, "글자 색", "#8811aa");
  await expect(page.getByRole("button", { name: "글자 색", exact: true })).toHaveAttribute("data-color", "#8811aa");
  await chooseDocColor(page, "글자 배경색", "#ffee44");
  await expect(page.getByRole("button", { name: "글자 색", exact: true })).toHaveAttribute("data-color", "#8811aa");
  await expect(page.getByRole("button", { name: "글자 배경색", exact: true })).toHaveAttribute("data-color", "#ffee44");
  await page.keyboard.insertText("새");
  const added = page.getByTestId("note-body").locator("span").filter({ hasText: /^새$/ }).last();
  await expect(added).toHaveCSS("color", "rgb(136, 17, 170)");
  await expect(added).toHaveCSS("background-color", "rgb(255, 238, 68)");
});

test.describe("모바일 터치 색상 선택", () => {
test.use({ viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true });
test("R11: 모바일 더보기 안에서도 선택한 글에 색을 적용한다", async ({ page }) => {
  await selectText(page, "#blue");
  await page.getByRole("button", { name: "더보기", exact: true }).tap();
  await chooseDocColor(page, "글자 색", "#8811aa", true);
  await expect(page.getByRole("button", { name: "글자 색", exact: true })).toHaveAttribute("data-color", "#8811aa");
  await expect(page.getByTestId("note-body").locator("#red")).toHaveCSS("color", "rgb(179, 18, 63)");
  await expect(page.getByTestId("note-body").locator("#blue")).toHaveCSS("color", "rgb(136, 17, 170)");
  await page.getByRole("button", { name: "더보기", exact: true }).tap();
  expect((await page.getByRole("toolbar", { name: "서식", exact: true }).boundingBox())!.height).toBeLessThanOrEqual(60);
});
});
