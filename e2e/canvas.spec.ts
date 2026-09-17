import { expect, test, type Locator, type Page } from "@playwright/test";
import { signUpAndEnter } from "./support/account";

// 자동 저장은 입력이 멈추고 2초 뒤에 일어난다. 그보다 넉넉히 기다린다.
const SAVED = { timeout: 20_000 };

async function createCanvasNote(page: Page) {
  await page.getByRole("button", { name: "새 노트 만들기" }).first().click();
  await page.getByRole("button", { name: "그림판" }).click();
  await page.waitForURL(/\/notes\//);
}

/**
 * 저장이 실제로 한 번 더 끝난 것을 확인한다. 저장 표시의 횟수가 오르는 것을
 * 기다리므로, 이미 "저장됨"이던 상태를 완료로 잘못 읽지 않는다.
 */
async function waitForSave(page: Page, before: string | null) {
  await expect(page.getByTestId("save-state")).not.toHaveAttribute(
    "data-saved-count",
    before ?? "0",
    SAVED,
  );
}

function savedCount(page: Page) {
  return page.getByTestId("save-state").getAttribute("data-saved-count");
}

/** 그림면 위에서 한 획을 긋는다. 좌표는 그림면 왼쪽 위를 기준으로 한다. */
async function drag(
  page: Page,
  paper: Locator,
  from: { x: number; y: number },
  to: { x: number; y: number },
) {
  const box = (await paper.boundingBox())!;
  await page.mouse.move(box.x + from.x, box.y + from.y);
  await page.mouse.down();
  await page.mouse.move(box.x + (from.x + to.x) / 2, box.y + (from.y + to.y) / 2);
  await page.mouse.move(box.x + to.x, box.y + to.y);
  await page.mouse.up();
}

async function pickTool(page: Page, label: string) {
  await page.getByRole("button", { name: label, exact: true }).click();
}

test("그림판에 선, 도형, 글상자를 넣으면 다시 열어도 그대로 있다", async ({ page }) => {
  await signUpAndEnter(page);
  await createCanvasNote(page);

  const paper = page.getByTestId("note-body");
  const elements = page.getByTestId("canvas-element");

  // 자유 선
  await drag(page, paper, { x: 40, y: 40 }, { x: 200, y: 120 });
  await expect(elements).toHaveCount(1);

  // 사각형, 원, 선, 화살표
  await pickTool(page, "사각형");
  await drag(page, paper, { x: 240, y: 40 }, { x: 360, y: 120 });
  await pickTool(page, "원");
  await drag(page, paper, { x: 400, y: 40 }, { x: 500, y: 120 });
  await pickTool(page, "선");
  await drag(page, paper, { x: 40, y: 180 }, { x: 200, y: 180 });
  await pickTool(page, "화살표");
  await drag(page, paper, { x: 240, y: 180 }, { x: 400, y: 180 });

  // 글상자
  await pickTool(page, "글상자");
  const box = (await paper.boundingBox())!;
  await page.mouse.click(box.x + 60, box.y + 260);
  await page.getByLabel("글상자 내용").fill("제주공항 도착");
  await page.getByLabel("글상자 내용").press("Enter");

  await expect(elements).toHaveCount(6);
  await expect(page.locator('[data-kind="pen"]')).toHaveCount(1);
  await expect(page.locator('[data-kind="rect"]')).toHaveCount(1);
  await expect(page.locator('[data-kind="ellipse"]')).toHaveCount(1);
  await expect(page.locator('[data-kind="line"]')).toHaveCount(1);
  await expect(page.locator('[data-kind="arrow"]')).toHaveCount(1);
  await expect(page.locator('[data-kind="text"]')).toHaveCount(1);

  await waitForSave(page, "0");
  await page.reload();
  await expect(elements).toHaveCount(6);

  // 다시 열어 이어 그릴 수 있다
  await drag(page, paper, { x: 440, y: 260 }, { x: 560, y: 320 });
  await expect(elements).toHaveCount(7);
  await waitForSave(page, "0");
  await page.reload();
  await expect(elements).toHaveCount(7);
});

test("되돌리기가 마지막 요소 하나만 지운다", async ({ page }) => {
  await signUpAndEnter(page);
  await createCanvasNote(page);

  const paper = page.getByTestId("note-body");
  const elements = page.getByTestId("canvas-element");

  await pickTool(page, "사각형");
  await drag(page, paper, { x: 40, y: 40 }, { x: 160, y: 120 });
  await pickTool(page, "원");
  await drag(page, paper, { x: 200, y: 40 }, { x: 320, y: 120 });
  await pickTool(page, "화살표");
  await drag(page, paper, { x: 40, y: 180 }, { x: 320, y: 180 });
  await expect(elements).toHaveCount(3);

  await page.getByRole("button", { name: "되돌리기" }).click();
  await expect(elements).toHaveCount(2);
  await expect(page.locator('[data-kind="arrow"]')).toHaveCount(0);
  await expect(page.locator('[data-kind="rect"]')).toHaveCount(1);
  await expect(page.locator('[data-kind="ellipse"]')).toHaveCount(1);

  await page.getByRole("button", { name: "되돌리기" }).click();
  await expect(elements).toHaveCount(1);
  await expect(page.locator('[data-kind="rect"]')).toHaveCount(1);

  const before = await savedCount(page);
  await waitForSave(page, before);
  await page.reload();
  await expect(elements).toHaveCount(1);
});

test("지우개로 고른 요소만 지운다", async ({ page }) => {
  await signUpAndEnter(page);
  await createCanvasNote(page);

  const paper = page.getByTestId("note-body");
  const elements = page.getByTestId("canvas-element");

  await pickTool(page, "사각형");
  await drag(page, paper, { x: 40, y: 40 }, { x: 160, y: 120 });
  await pickTool(page, "원");
  await drag(page, paper, { x: 300, y: 40 }, { x: 420, y: 120 });
  await expect(elements).toHaveCount(2);

  await pickTool(page, "지우개");
  const box = (await paper.boundingBox())!;
  // 사각형의 위쪽 변을 집는다
  await page.mouse.click(box.x + 100, box.y + 40);

  await expect(elements).toHaveCount(1);
  await expect(page.locator('[data-kind="ellipse"]')).toHaveCount(1);
  await expect(page.locator('[data-kind="rect"]')).toHaveCount(0);
});

test("목록에서 그림판 노트가 그림을 줄인 미리보기로 보인다", async ({ page }) => {
  await signUpAndEnter(page);
  await createCanvasNote(page);

  const paper = page.getByTestId("note-body");
  await pickTool(page, "사각형");
  await drag(page, paper, { x: 40, y: 40 }, { x: 300, y: 200 });
  await waitForSave(page, "0");

  await page.goto("/");
  const item = page.getByTestId("note-item").first();
  await expect(item).toContainText("그림판");
  // 미리보기가 빈 칸이 아니라 실제로 그린 도형을 담고 있다
  await expect(item.locator("svg rect")).toHaveCount(1);
});
