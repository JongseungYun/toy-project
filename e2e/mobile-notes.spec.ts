import { expect, test, type Page } from "@playwright/test";
import { createDocNote, signUpAndEnter } from "./support/account";

test.use({ viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true });
const SAVED = { timeout: 20_000 };

test.beforeEach(async ({ page }) => {
  await signUpAndEnter(page);
  // 개발 도구 배지가 첫 서식 버튼을 덮으므로 검증 화면에서만 숨긴다.
  await page.addStyleTag({ content: "nextjs-portal { display: none; }" });
});

async function expectHeaderFits(page: Page) {
  const title = page.getByLabel("노트 제목", { exact: true });
  await expect(title).toBeVisible();
  expect((await title.boundingBox())!.width).toBeGreaterThanOrEqual(200);
  const bounds = (await page.locator("main").boundingBox())!;
  for (const button of await page.getByTestId("note-actions").getByRole("button").all()) {
    const box = (await button.boundingBox())!;
    expect(box.x).toBeGreaterThanOrEqual(bounds.x);
    expect(box.x + box.width).toBeLessThanOrEqual(bounds.x + bounds.width + 1);
  }
}

test("R09: 작은 화면과 좁은 본문 칸에서 제목과 서식 도구를 읽고 편집한다", async ({ page }) => {
  await createDocNote(page);
  const title = page.getByLabel("노트 제목", { exact: true });
  const body = page.getByTestId("note-body");
  const toolbar = page.getByRole("toolbar", { name: "서식", exact: true });
  await title.fill("모바일에서 편집한 제목");
  await body.fill("작은 화면의 서식 검증");
  for (const width of [320, 390, 768]) {
    await page.setViewportSize({ width, height: 844 });
    await expectHeaderFits(page);
    expect((await toolbar.boundingBox())!.height).toBeLessThanOrEqual(60);
    await expect(toolbar.getByRole("combobox", { name: "글꼴", exact: true })).toBeHidden();
    await expect(toolbar.getByRole("button", { name: "글머리 목록", exact: true })).toBeVisible();
  }
  await page.setViewportSize({ width: 390, height: 844 });
  await body.press("ControlOrMeta+a");
  await toolbar.getByRole("button", { name: "굵게", exact: true }).tap();
  await expect(toolbar.getByRole("button", { name: "굵게", exact: true })).toHaveAttribute("aria-pressed", "true");
  const more = toolbar.getByRole("button", { name: "더보기", exact: true });
  await more.tap();
  await expect(more).toHaveAttribute("aria-expanded", "true");
  await toolbar.getByRole("combobox", { name: "글자 크기", exact: true }).tap();
  await page.getByRole("option", { name: "20", exact: true }).tap();
  await expect(body.locator('[style*="font-size: 20px"]').first()).toBeVisible();
  await more.tap();
  await expect(more).toHaveAttribute("aria-expanded", "false");
  await expect(page.getByTestId("save-state")).not.toHaveAttribute("data-saved-count", "0", SAVED);
  await page.reload();
  await expect(title).toHaveValue("모바일에서 편집한 제목");
  await expect(body).toContainText("작은 화면의 서식 검증");
  await page.setViewportSize({ width: 1366, height: 900 });
  await expectHeaderFits(page);
  await expect(more).toBeHidden();
  await expect(toolbar.getByRole("combobox", { name: "글꼴", exact: true })).toBeVisible();
});

test("R09: 기존 문서의 긴 줄은 줄바꿈하고 코드는 블록 안에서 가로 스크롤한다", async ({ page }) => {
  await createDocNote(page);
  const body = page.getByTestId("note-body");
  await body.evaluate((editor) => {
    editor.innerHTML = `<p style="white-space:nowrap;width:900px"><span style="color:rgb(179,18,63)">https://example.com/${"LongUnbrokenUrl".repeat(30)}</span></p><pre>${"const value = 123; ".repeat(40)}</pre>`;
    editor.dispatchEvent(new Event("input", { bubbles: true }));
  });
  await expect(page.getByTestId("save-state")).not.toHaveAttribute("data-saved-count", "0", SAVED);
  await page.reload();
  await expect(body).toBeVisible();
  for (const width of [320, 390]) {
    await page.setViewportSize({ width, height: 844 });
    expect(await body.evaluate((el) => el.scrollWidth - el.clientWidth)).toBeLessThanOrEqual(1);
    expect(await page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth)).toBeLessThanOrEqual(1);
  }
  await expect(body.locator("p")).toHaveAttribute("style", /white-space:\s?nowrap/);
  await expect(body.locator("span")).toHaveCSS("color", "rgb(179, 18, 63)");
  const code = body.locator("pre");
  expect(await code.evaluate((el) => el.scrollWidth)).toBeGreaterThan(await code.evaluate((el) => el.clientWidth));
  expect(await code.evaluate((el) => { el.scrollLeft = 100; return el.scrollLeft; })).toBeGreaterThan(0);
});

test("R09: Markdown의 긴 URL·코드·표가 본문 칸 전체를 가로로 밀지 않는다", async ({ page }) => {
  await page.getByRole("button", { name: "새 노트 만들기" }).first().tap();
  await page.getByRole("button", { name: "Markdown" }).tap();
  const body = page.getByTestId("note-body");
  const columns = Array.from({ length: 16 }, (_, i) => `열${i + 1}`);
  const table = `| ${columns.join(" | ")} |\n| ${columns.map(() => "---").join(" | ")} |\n| ${columns.map(() => "값").join(" | ")} |`;
  await body.fill(`https://example.com/${"UnbrokenUrl".repeat(50)}\n\n\x60\x60\x60js\n${"const x = 123; ".repeat(50)}\n\x60\x60\x60\n\n${table}`);
  await page.setViewportSize({ width: 320, height: 844 });
  await expectHeaderFits(page);
  const viewer = page.getByTestId("md-viewer");
  expect(await viewer.evaluate((el) => el.scrollWidth - el.clientWidth)).toBeLessThanOrEqual(1);
  for (const selector of ["pre", "table"]) {
    const block = viewer.locator(selector);
    await expect(block).toBeVisible();
    expect(await block.evaluate((el) => el.scrollWidth)).toBeGreaterThan(await block.evaluate((el) => el.clientWidth));
  }
  await page.getByRole("button", { name: "뷰어", exact: true }).tap();
  await expect(viewer).toHaveCount(0);
  await expect(body).toBeVisible();
});

test("R09: 표시 높이가 줄어도 제목·본문 입력과 서식 도구를 유지한다", async ({ page }) => {
  await createDocNote(page);
  const body = page.getByTestId("note-body");
  await body.fill(Array.from({ length: 35 }, (_, i) => `${i + 1}번째 줄`).join("\n"));
  // 실기기 키보드 대신 visualViewport의 높이 변경 이벤트를 재현한다.
  await page.evaluate(() => {
    Object.defineProperty(window.visualViewport!, "height", { configurable: true, value: 420 });
    window.visualViewport!.dispatchEvent(new Event("resize"));
  });
  const shell = page.getByTestId("library-viewport");
  await expect.poll(async () => (await shell.boundingBox())!.height).toBe(420);
  const toolbar = (await page.getByRole("toolbar", { name: "서식", exact: true }).boundingBox())!;
  expect(toolbar.y + toolbar.height).toBeLessThanOrEqual(420);
  await body.click();
  await body.press("ControlOrMeta+End");
  await page.keyboard.press("Enter");
  await page.keyboard.insertText("키보드 높이가 줄어든 상태의 한글 입력");
  await expect(body).toBeFocused();
  await expect(body).toContainText("한글 입력");
  await expectHeaderFits(page);
  // 확대는 편집기 높이를 다시 줄이지 않는다.
  await page.evaluate(() => {
    Object.defineProperty(window.visualViewport!, "scale", { configurable: true, value: 2 });
    Object.defineProperty(window.visualViewport!, "height", { configurable: true, value: 200 });
    window.visualViewport!.dispatchEvent(new Event("resize"));
  });
  expect((await shell.boundingBox())!.height).toBe(420);
  await page.evaluate(() => {
    Reflect.deleteProperty(window.visualViewport!, "height");
    Reflect.deleteProperty(window.visualViewport!, "scale");
    window.visualViewport!.dispatchEvent(new Event("resize"));
  });
  await expect.poll(async () => (await shell.boundingBox())!.height).toBe(844);
  await expect(body).toContainText("한글 입력");
});

test("R09: 연결 끊김 안내도 제목이나 작업 버튼을 가리지 않는다", async ({ page, context }) => {
  await createDocNote(page);
  await expect(page.getByTestId("note-body")).toBeVisible();
  await page.setViewportSize({ width: 320, height: 844 });
  await context.setOffline(true);
  await page.getByTestId("note-body").fill("작은 화면의 연결 끊김 중 입력");
  const state = page.getByTestId("save-state");
  await expect(state).toHaveAttribute("data-state", "offline");
  await expect(state).toContainText("초안은 이 기기에 보관됨");
  await expectHeaderFits(page);
  const header = (await page.getByTestId("note-header").boundingBox())!;
  expect(await state.evaluate((el) => el.scrollWidth)).toBeLessThanOrEqual(header.width);
  await context.setOffline(false);
  await expect(state).toHaveAttribute("data-state", "error");
  await state.getByRole("button").tap();
  await expect(state).toHaveAttribute("data-state", "saved", SAVED);
});

test("R09: 그림판도 좁은 화면에서 제목과 공통 작업 버튼을 사용할 수 있다", async ({ page }) => {
  await page.getByRole("button", { name: "새 노트 만들기" }).first().tap();
  await page.getByRole("button", { name: "그림판" }).tap();
  await page.getByLabel("노트 제목", { exact: true }).fill("모바일 그림판 제목");
  await page.setViewportSize({ width: 320, height: 844 });
  await expectHeaderFits(page);
  await expect(page.getByRole("button", { name: "펜", exact: true })).toBeVisible();
  await expect(page.getByTestId("save-state")).not.toHaveAttribute("data-saved-count", "0", SAVED);
});
