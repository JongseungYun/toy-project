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

test("R13: 겹친 요소 중 위쪽만 이동하고 취소·되돌리기·재저장을 지원한다", async ({ page }) => {
  await openCanvas(page);
  await draw(page, "사각형", 80);
  await draw(page, "원", 100);
  const paper = page.getByTestId("note-body");
  const box = (await paper.boundingBox())!;
  const ellipse = paper.locator('[data-kind="ellipse"] > ellipse');
  const rect = paper.locator('[data-kind="rect"] > rect');
  const origin = (await ellipse.getAttribute("cx"))!;
  const rectStart = await rect.getAttribute("x");
  const select = page.getByRole("button", { name: "선택 및 이동" });
  await select.click();
  const drag = async () => {
    await page.mouse.move(box.x + 150, box.y + 110);
    await page.mouse.down();
    await page.mouse.move(box.x + 245, box.y + 160, { steps: 6 });
  };
  await drag();
  await page.keyboard.press("Escape");
  await page.mouse.up();
  await expect(ellipse).toHaveAttribute("cx", origin);
  await drag();
  await page.mouse.up();
  await expect(ellipse).not.toHaveAttribute("cx", origin);
  const moved = (await ellipse.getAttribute("cx"))!;
  await expect(rect).toHaveAttribute("x", rectStart!);
  await paper.press("ControlOrMeta+z");
  await expect(ellipse).toHaveAttribute("cx", origin);
  await page.mouse.click(box.x + 150, box.y + 110);
  await paper.press("ControlOrMeta+Shift+z");
  await expect(ellipse).toHaveAttribute("cx", moved);
  await select.click();
  await paper.focus();
  await page.keyboard.press("Tab");
  await page.keyboard.press("ArrowRight");
  await expect(rect).toHaveAttribute("x", String(Number(rectStart) + 1));
  await expect(page.getByTestId("save-state")).toHaveAttribute("data-state", "saved", SAVED);
  await page.reload();
  await expect(ellipse).toHaveAttribute("cx", moved);
  await expect(rect).toHaveAttribute("x", String(Number(rectStart) + 1));
});

test("R13: 좁은 화면에서 펜 자국을 손가락으로 잡아 원래 모양대로 옮긴다", async ({ page, context }) => {
  await openCanvas(page);
  await page.setViewportSize({ width: 390, height: 844 });
  await draw(page, "펜", 35);
  await page.getByRole("button", { name: "선택 및 이동" }).click();
  const paper = page.getByTestId("note-body");
  const stroke = paper.locator('[data-kind="pen"] > polyline');
  const points = () => stroke.evaluate((line: SVGPolylineElement) =>
    Array.from(line.points, (p) => ({ x: p.x, y: p.y })));
  const before = await points();
  const { x, y, scale } = await stroke.evaluate((line: SVGPolylineElement) => {
    const matrix = line.getScreenCTM()!;
    const point = line.points.getItem(0).matrixTransform(matrix);
    return { x: point.x, y: point.y, scale: matrix.a };
  });
  const client = await context.newCDPSession(page);
  try {
    await client.send("Input.dispatchTouchEvent", { type: "touchStart", touchPoints: [{ x, y }] });
    await client.send("Input.dispatchTouchEvent", { type: "touchMove", touchPoints: [{ x: x + 40, y: y + 50 }] });
    await client.send("Input.dispatchTouchEvent", { type: "touchEnd", touchPoints: [] });
    await expect.poll(points).toEqual(before.map((p) => ({
      x: p.x + Math.round(40 / scale), y: p.y + Math.round(50 / scale),
    })));
  } finally {
    await client.detach();
  }
});

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
