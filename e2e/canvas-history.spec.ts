import { expect, test, type Page } from "@playwright/test";
import { signInAndEnter, signUpAndEnter } from "./support/account";

const SAVED = { timeout: 20_000 };

async function openCanvas(page: Page) {
  await page.setViewportSize({ width: 1440, height: 900 });
  const username = await signUpAndEnter(page);
  await page.getByRole("button", { name: "새 노트 만들기" }).first().click();
  await page.getByRole("button", { name: "그림판" }).click();
  const paper = page.getByTestId("note-body");
  await expect(paper).toBeVisible();
  await expect.poll(async () => (await paper.boundingBox())?.width ?? 0).toBeGreaterThan(900);
  return username;
}

async function draw(page: Page, tool: string, x: number, y = 70) {
  await page.getByRole("button", { name: tool, exact: true }).click();
  const box = (await page.getByTestId("note-body").boundingBox())!;
  await page.mouse.move(box.x + x, box.y + y);
  await page.mouse.down();
  await page.mouse.move(box.x + x + 100, box.y + y + 80, { steps: 4 });
  await page.mouse.up();
}

test("R12: 지우기로 삭제한 요소를 되돌리고 다시 실행한다", async ({ page }) => {
  await openCanvas(page);
  const elements = page.getByTestId("canvas-element");
  await draw(page, "사각형", 80);
  await draw(page, "원", 300);
  await expect(elements).toHaveCount(2);
  await page.getByRole("button", { name: "지우개", exact: true }).click();
  const box = (await page.getByTestId("note-body").boundingBox())!;
  await page.mouse.click(box.x + 130, box.y + 70);
  await expect(elements).toHaveCount(1);
  await page.getByRole("button", { name: "되돌리기", exact: true }).click();
  await expect(elements).toHaveCount(2);
  await expect(elements.filter({ has: page.locator("rect") })).toHaveCount(1);
  await page.getByRole("button", { name: "다시 실행", exact: true }).click();
  await expect(elements).toHaveCount(1);
  await expect(page.locator('[data-kind="ellipse"]')).toHaveCount(1);
});

test("R12: 지우개 드래그의 여러 삭제는 저장 도중에도 한 작업으로 되돌린다", async ({ page }) => {
  await openCanvas(page);
  for (const x of [80, 300, 520]) await draw(page, "사각형", x);
  await draw(page, "원", 730, 320);
  const elements = page.getByTestId("canvas-element");
  const state = page.getByTestId("save-state");
  await expect(state).toHaveAttribute("data-state", "saved", SAVED);
  const saved = await state.getAttribute("data-saved-count");
  await page.getByRole("button", { name: "지우개", exact: true }).click();
  const ids = () => page.locator("[data-eraser-hit]").evaluateAll((nodes) => nodes.map((node) => node.getAttribute("data-eraser-hit")));
  const before = await ids();
  const box = (await page.getByTestId("note-body").boundingBox())!;
  await page.mouse.move(box.x + 30, box.y + 110);
  await page.mouse.down();
  await page.mouse.move(box.x + 210, box.y + 110);
  await expect(elements).toHaveCount(3);
  await expect(page.getByRole("button", { name: "되돌리기", exact: true })).toBeDisabled();
  await expect(state).not.toHaveAttribute("data-saved-count", saved ?? "0", SAVED);
  await page.mouse.move(box.x + 450, box.y + 110);
  await expect(elements).toHaveCount(2);
  await page.mouse.move(box.x + 650, box.y + 110);
  await page.mouse.up();
  await expect(elements).toHaveCount(1);
  await page.getByRole("button", { name: "되돌리기", exact: true }).click();
  await expect(elements).toHaveCount(4);
  expect(await ids()).toEqual(before);
  await page.getByRole("button", { name: "다시 실행", exact: true }).click();
  await expect(elements).toHaveCount(1);
  await expect(state).toHaveAttribute("data-state", "saved", SAVED);
  await page.reload();
  await expect(elements).toHaveCount(1);
  await expect(page.getByRole("button", { name: "되돌리기", exact: true })).toBeDisabled();
  await expect(page.getByRole("button", { name: "다시 실행", exact: true })).toBeDisabled();
});

test("R12: 빈 동작은 다시 실행을 유지하고 새 편집은 이전 갈래를 비운다", async ({ page }) => {
  await openCanvas(page);
  await draw(page, "사각형", 80);
  await draw(page, "원", 300);
  const redo = page.getByRole("button", { name: "다시 실행", exact: true });
  await page.getByRole("button", { name: "되돌리기", exact: true }).click();
  const box = (await page.getByTestId("note-body").boundingBox())!;
  for (const tool of ["지우개", "사각형", "펜"]) {
    await page.getByRole("button", { name: tool, exact: true }).click();
    await page.mouse.click(box.x + 650, box.y + 300);
    await expect(redo).toBeEnabled();
    await expect(page.getByTestId("canvas-element")).toHaveCount(1);
  }
  await draw(page, "화살표", 500, 250);
  await expect(redo).toBeDisabled();
  await page.getByRole("button", { name: "되돌리기", exact: true }).click();
  await expect(page.locator('[data-kind="arrow"]')).toHaveCount(0);
  await redo.click();
  await expect(page.locator('[data-kind="arrow"]')).toHaveCount(1);
  await expect(page.locator('[data-kind="ellipse"]')).toHaveCount(0);
});

test("R12: 단축키로 추가 작업을 반복 취소·재실행하고 글자 입력과 구분한다", async ({ page }) => {
  await openCanvas(page);
  const undo = page.getByRole("button", { name: "되돌리기", exact: true });
  const redo = page.getByRole("button", { name: "다시 실행", exact: true });
  const paper = page.getByTestId("note-body");
  const elements = page.getByTestId("canvas-element");
  await expect(undo).toBeDisabled();
  await expect(redo).toBeDisabled();
  await draw(page, "펜", 80);
  await draw(page, "사각형", 300);
  await page.getByRole("button", { name: "글상자", exact: true }).click();
  const box = (await paper.boundingBox())!;
  await page.mouse.click(box.x + 520, box.y + 200);
  await page.getByLabel("글상자 내용").fill("되살릴 글상자");
  await page.getByLabel("글상자 내용").press("Enter");
  await expect(elements).toHaveCount(3);
  await paper.focus();
  await paper.press("ControlOrMeta+z");
  await expect(elements).toHaveCount(2);
  await paper.press("ControlOrMeta+Shift+z");
  await expect(elements).toHaveCount(3);
  await paper.press("ControlOrMeta+z");
  await paper.press("Control+y");
  await expect(elements).toHaveCount(3);
  const title = page.getByLabel("노트 제목", { exact: true });
  await title.fill("제목 입력의 되돌리기는 별개");
  await title.press("ControlOrMeta+z");
  await expect(elements).toHaveCount(3);
  for (let step = 0; step < 3; step++) await paper.press("ControlOrMeta+z");
  await expect(elements).toHaveCount(0);
  await expect(undo).toBeDisabled();
  await expect(redo).toBeEnabled();
  for (let step = 0; step < 3; step++) await redo.click();
  await expect(elements).toHaveCount(3);
  await expect(page.locator('[data-kind="text"]')).toContainText("되살릴 글상자");
  await expect(redo).toBeDisabled();
});

test("R12: 브라우저 초안을 복구하면 복구한 그림에서 새 이력을 시작한다", async ({ page, context }) => {
  await openCanvas(page);
  await draw(page, "사각형", 80);
  await expect(page.getByTestId("save-state")).toHaveAttribute("data-state", "saved", SAVED);
  await context.setOffline(true);
  await page.getByRole("button", { name: "지우개", exact: true }).click();
  const box = (await page.getByTestId("note-body").boundingBox())!;
  await page.mouse.click(box.x + 130, box.y + 70);
  await expect(page.getByTestId("canvas-element")).toHaveCount(0);
  await expect(page.getByTestId("save-state")).toHaveAttribute("data-state", "offline");
  await expect(page.getByRole("button", { name: "되돌리기", exact: true })).toBeEnabled();
  await context.setOffline(false);
  await page.reload();
  await expect(page.getByTestId("note-body")).toBeVisible();
  await expect(page.getByTestId("canvas-element")).toHaveCount(0);
  await expect(page.getByRole("button", { name: "되돌리기", exact: true })).toBeDisabled();
  await expect(page.getByRole("button", { name: "다시 실행", exact: true })).toBeDisabled();
  await draw(page, "원", 300);
  await page.getByRole("button", { name: "되돌리기", exact: true }).click();
  await expect(page.getByTestId("canvas-element")).toHaveCount(0);
});

test("R12: 충돌에서 최신 그림을 불러오면 이전 작업 이력으로 덮지 않는다", async ({ page, browser }) => {
  const username = await openCanvas(page);
  await draw(page, "사각형", 80);
  await expect(page.getByTestId("save-state")).toHaveAttribute("data-state", "saved", SAVED);
  const noteUrl = page.url();
  const other = await browser.newContext({ locale: "ko-KR", viewport: { width: 1440, height: 900 } });
  try {
    const second = await other.newPage();
    await signInAndEnter(second, username);
    await second.goto(noteUrl);
    await expect.poll(async () => (await second.getByTestId("note-body").boundingBox())?.width ?? 0).toBeGreaterThan(900);
    await draw(second, "원", 300);
    await expect(second.getByTestId("save-state")).toHaveAttribute("data-state", "saved", SAVED);
    await draw(page, "펜", 500, 250);
    await expect(page.getByTestId("save-state")).toHaveAttribute("data-state", "conflict", SAVED);
    await page.getByRole("button", { name: "최신 내용 불러오기", exact: true }).click();
    await expect(page.locator('[data-kind="ellipse"]')).toHaveCount(1);
    await expect(page.locator('[data-kind="pen"]')).toHaveCount(0);
    await expect(page.getByRole("button", { name: "되돌리기", exact: true })).toBeDisabled();
    await expect(page.getByRole("button", { name: "다시 실행", exact: true })).toBeDisabled();
  } finally {
    await other.close();
  }
});

test("R12: 320px 화면에서도 제목·저장 표시와 실행 취소 버튼을 사용할 수 있다", async ({ page }) => {
  await openCanvas(page);
  await page.setViewportSize({ width: 320, height: 844 });
  await draw(page, "사각형", 50);
  await page.getByRole("button", { name: "되돌리기", exact: true }).click();
  await page.getByRole("button", { name: "다시 실행", exact: true }).click();
  await expect(page.getByTestId("save-state")).toHaveAttribute("data-state", "saved", SAVED);
  expect((await page.getByLabel("노트 제목", { exact: true }).boundingBox())!.width).toBeGreaterThanOrEqual(200);
  const state = page.getByTestId("save-state");
  expect(await state.evaluate((el) => el.scrollWidth - el.clientWidth)).toBeLessThanOrEqual(1);
  const main = (await page.locator("main").boundingBox())!;
  for (const name of ["되돌리기", "다시 실행"]) {
    const box = (await page.getByRole("button", { name, exact: true }).boundingBox())!;
    expect(box.x).toBeGreaterThanOrEqual(main.x);
    expect(box.x + box.width).toBeLessThanOrEqual(main.x + main.width);
  }
});
