import { readFileSync } from "node:fs";
import { expect, test, type Page } from "@playwright/test";
import { createDocNote, signUpAndEnter } from "./support/account";

async function insertTable(page: Page, rows = 3, columns = 3) {
  await page.getByRole("button", { name: "표 도구", exact: true }).click();
  const dialog = page.getByRole("dialog", { name: "표 도구" });
  await dialog.getByLabel("행 수", { exact: true }).fill(String(rows));
  await dialog.getByLabel("열 수", { exact: true }).fill(String(columns));
  await dialog.getByRole("button", { name: "표 추가", exact: true }).click();
  await expect(dialog).not.toBeVisible();
}

async function editTable(page: Page, action: string) {
  await page.getByRole("button", { name: "표 도구", exact: true }).click();
  await page.getByRole("dialog", { name: "표 도구" }).getByRole("button", { name: action, exact: true }).click();
}

test("일반 문서에서 표를 넣고 행·열을 편집하며 삭제를 되돌리고 다시 연다", async ({ page }) => {
  await signUpAndEnter(page);
  await createDocNote(page);
  const body = page.getByTestId("note-body");
  await body.fill("표 앞 문단");
  await body.press("End");
  await body.press("Enter");
  await insertTable(page);
  const table = body.locator("table");
  await expect(table).toHaveCount(1);
  await expect(table.locator("tr")).toHaveCount(3);
  await expect(table.locator("th")).toHaveCount(3);
  await page.keyboard.type("항목");
  await page.keyboard.press("Tab");
  await page.keyboard.type("담당자");
  await expect(table.locator("th").nth(1)).toHaveText("담당자");
  await page.keyboard.press("Shift+Tab");
  await page.keyboard.press("End");
  await page.keyboard.type("명");
  await expect(table.locator("th").first()).toHaveText("항목명");

  await editTable(page, "아래에 행 추가");
  await expect(table).toHaveCount(1);
  await expect(table.locator("tr")).toHaveCount(4);
  await page.keyboard.type("구현");
  await editTable(page, "오른쪽에 열 추가");
  await expect(table.locator("tr").nth(1).locator("td")).toHaveCount(4);
  await editTable(page, "열 삭제");
  await expect(table.locator("tr").nth(1).locator("td")).toHaveCount(3);
  await editTable(page, "행 삭제");
  await expect(table.locator("tr")).toHaveCount(3);
  await body.press("Control+z");
  await expect(table.locator("tr")).toHaveCount(4);
  await expect(table).toContainText("구현");
  await body.press("Control+Shift+z");
  await expect(table.locator("tr")).toHaveCount(3);
  await table.locator("td").last().click();
  await page.keyboard.press("Tab");
  await expect(table.locator("tr")).toHaveCount(4);
  await page.keyboard.type("추가 행");
  await expect(table.locator("tr").last().locator("td").first()).toHaveText("추가 행");
  await editTable(page, "표 삭제");
  await expect(table).toHaveCount(0);
  await expect(body).toContainText("표 앞 문단");
  await body.press("Control+z");
  await expect(table).toHaveCount(1);
  await expect(table).toContainText("추가 행");
  await expect(page.getByTestId("save-state")).toHaveAttribute("data-saved-count", /[1-9]\d*/, { timeout: 20_000 });
  await expect(page.getByTestId("save-state")).toHaveAttribute("data-state", "saved", { timeout: 20_000 });
  await page.reload();
  await expect(table.locator("tr")).toHaveCount(4);
  await expect(table).toContainText("항목명");
  await expect(table).toContainText("추가 행");
  await expect(body).toContainText("표 앞 문단");
});

test("모바일에서 표 도구를 터치하고 표만 가로로 스크롤한다", async ({ browser, baseURL }) => {
  const context = await browser.newContext({ baseURL, viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true, locale: "ko-KR" });
  const page = await context.newPage();
  await signUpAndEnter(page);
  await createDocNote(page);
  await page.addStyleTag({ content: "nextjs-portal { display:none !important; }" });
  const body = page.getByTestId("note-body");
  await body.tap();
  await page.getByRole("button", { name: "더보기", exact: true }).tap();
  await page.getByRole("button", { name: "표 도구", exact: true }).tap();
  const dialog = page.getByRole("dialog", { name: "표 도구" });
  await dialog.getByLabel("열 수", { exact: true }).fill("6");
  await dialog.getByRole("button", { name: "표 추가", exact: true }).tap();
  const table = body.locator("table");
  await expect(table.locator("th")).toHaveCount(6);
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
  expect(await table.evaluate((node) => node.scrollWidth > node.clientWidth)).toBe(true);
  await table.locator("th").first().tap();
  await page.keyboard.type("모바일 표");
  await page.getByRole("button", { name: "표 도구", exact: true }).tap();
  await dialog.getByRole("button", { name: "아래에 행 추가", exact: true }).tap();
  await expect(table.locator("tr")).toHaveCount(4);
  await expect(table).toContainText("모바일 표");
  await page.getByRole("button", { name: "표 도구", exact: true }).tap();
  await dialog.getByLabel("열 너비 (px)", { exact: true }).fill("160");
  await dialog.getByLabel("행 높이 (px)", { exact: true }).fill("70");
  await dialog.getByRole("button", { name: "크기 적용", exact: true }).tap();
  await expect(table.locator("td").first()).toHaveCSS("width", "160px");
  await expect(table.locator("tr").nth(1)).toHaveCSS("height", "70px");
  await context.close();
});

test("표를 붙여넣고 셀 서식을 지워도 공유와 HTML 내보내기에 표가 남는다", async ({ page, browser }) => {
  await signUpAndEnter(page);
  await createDocNote(page);
  const body = page.getByTestId("note-body");
  await body.click();
  await body.evaluate((editor) => {
    const data = new DataTransfer();
    data.setData("text/html", '<table><tbody><tr><th>항목</th><th>상태</th></tr><tr><td><b>회의</b></td><td>완료</td></tr></tbody></table>');
    editor.dispatchEvent(new ClipboardEvent("paste", { bubbles: true, cancelable: true, clipboardData: data }));
    const range = document.createRange();
    range.selectNodeContents(editor.querySelector("b")!);
    const selection = window.getSelection()!;
    selection.removeAllRanges();
    selection.addRange(range);
    document.dispatchEvent(new Event("selectionchange"));
  });
  await page.getByRole("button", { name: "서식 지우기", exact: true }).click();
  await expect(body.locator("td")).toHaveCount(2);
  await expect(body.locator("td").first()).toHaveText("회의");
  await expect(body.locator("b")).toHaveCount(0);
  await expect(page.getByTestId("save-state")).toHaveAttribute("data-saved-count", /[1-9]\d*/, { timeout: 20_000 });
  await expect(page.getByTestId("save-state")).toHaveAttribute("data-state", "saved", { timeout: 20_000 });
  const downloading = page.waitForEvent("download");
  await page.getByTestId("export-note").click();
  const file = readFileSync((await (await downloading).path())!, "utf8");
  expect(file).toContain("doc-tables");
  expect(file).toContain("<table");
  expect(file).toContain("회의");
  await page.getByRole("button", { name: "공유", exact: true }).click();
  await page.getByTestId("start-sharing").click();
  const link = await page.getByTestId("share-link").inputValue({ timeout: 20_000 });
  const guest = await browser.newContext({ locale: "ko-KR" });
  const shared = await guest.newPage();
  await shared.goto(link);
  await expect(shared.getByTestId("shared-body").locator("table")).toContainText("회의");
  await expect(shared.getByTestId("shared-body").locator("td").first()).toHaveCSS("border-top-width", "1px");
  await guest.close();
  await page.getByRole("button", { name: "공유 중지" }).click();
});

test("머리글의 흰 배경을 지우고 경계선 드래그·숫자 입력으로 표 크기를 저장한다", async ({ page }, testInfo) => {
  await signUpAndEnter(page);
  await createDocNote(page);
  const body = page.getByTestId("note-body");
  await body.click();
  await insertTable(page);
  const table = body.locator("table");
  await body.evaluate((editor) => {
    const data = new DataTransfer();
    data.setData("text/html", '<span style="background-color:rgb(255,255,255);font-size:14px">제목</span>');
    editor.dispatchEvent(new ClipboardEvent("paste", { bubbles: true, cancelable: true, clipboardData: data }));
  });
  await expect(table.locator("th").first()).toHaveText("제목");
  await expect(table.locator("th span").first()).toHaveCSS("background-color", "rgba(0, 0, 0, 0)");

  const before = (await table.locator("th").first().boundingBox())!;
  await page.mouse.move(before.x + before.width - 2, before.y + before.height / 2);
  await expect(body).toHaveCSS("cursor", "col-resize");
  await page.mouse.down();
  await page.mouse.move(before.x + before.width - 82, before.y + before.height / 2, { steps: 8 });
  await expect(page.locator(".doc-table-resize-guide")).toBeVisible();
  await page.mouse.up();
  await expect.poll(async () => (await table.locator("th").first().boundingBox())!.width).toBeLessThan(before.width - 60);
  const width = (await table.locator("th").first().boundingBox())!.width;
  await body.press("Control+z");
  await expect.poll(async () => (await table.locator("th").first().boundingBox())!.width).toBeGreaterThan(before.width - 3);
  await body.press("Control+Shift+z");
  await expect.poll(async () => Math.abs((await table.locator("th").first().boundingBox())!.width - width)).toBeLessThan(3);

  const header = (await table.locator("th").first().boundingBox())!;
  await page.mouse.move(header.x + header.width / 2, header.y + header.height - 2);
  await expect(body).toHaveCSS("cursor", "row-resize");
  await page.mouse.down();
  await page.mouse.move(header.x + header.width / 2, header.y + header.height + 38, { steps: 5 });
  await page.mouse.up();
  await expect.poll(async () => (await table.locator("tr").first().boundingBox())!.height).toBeGreaterThan(header.height + 30);

  await table.locator("th").first().click();
  await editTable(page, "아래에 행 추가");
  await expect(table.locator("tr")).toHaveCount(4);
  await expect.poll(async () => Math.abs((await table.locator("tr").nth(1).locator("td").first().boundingBox())!.width - width)).toBeLessThan(3);
  await editTable(page, "오른쪽에 열 추가");
  await expect(table.locator("tr").first().locator("th")).toHaveCount(4);
  await editTable(page, "열 삭제");
  await expect(table.locator("th")).toHaveCount(3);

  await page.getByRole("button", { name: "표 도구", exact: true }).click();
  const dialog = page.getByRole("dialog", { name: "표 도구" });
  await dialog.getByLabel("열 너비 (px)", { exact: true }).fill("180");
  await dialog.getByLabel("행 높이 (px)", { exact: true }).fill("90");
  await dialog.getByRole("button", { name: "크기 적용", exact: true }).click();
  await expect(table.locator("td").first()).toHaveCSS("width", "180px");
  await expect(table.locator("tr").nth(1)).toHaveCSS("height", "90px");
  await expect(page.getByTestId("save-state")).toHaveAttribute("data-saved-count", /[1-9]\d*/, { timeout: 20_000 });
  await expect(page.getByTestId("save-state")).toHaveAttribute("data-state", "saved", { timeout: 20_000 });
  await page.reload();
  await expect(body).toBeVisible();
  await expect(page.locator('[aria-busy="true"]')).toHaveCount(0);
  await expect(table.locator("td").first()).toHaveCSS("width", "180px");
  await expect(table.locator("tr").nth(1)).toHaveCSS("height", "90px");
  await expect(table.locator("th").first()).toContainText("제목");
  await page.screenshot({ path: testInfo.outputPath("table-resized.png") });
});
