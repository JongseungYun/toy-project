import { expect, test, type Page } from "@playwright/test";
import { createDocNote, signInAndEnter, signUpAndEnter } from "./support/account";

async function saved(page: Page) {
  await expect(page.getByTestId("save-state")).toHaveAttribute("data-state", "saved", { timeout: 20_000 });
  await expect(page.getByTestId("save-state")).not.toHaveAttribute("data-saved-count", "0");
}

async function createFormat(page: Page, format: string) {
  await page.getByRole("button", { name: "새 노트 만들기" }).first().click();
  await page.getByRole("button", { name: format }).click();
  await page.waitForURL(/\/notes\//);
}

test("R01: 입력 직후 새로고침해도 본문과 제목이 남는다", async ({ page }) => {
  await signUpAndEnter(page);
  await createDocNote(page);
  await page.getByTestId("note-body").fill("R01 마지막 입력");
  await page.getByLabel("노트 제목").fill("R01 저장 전 제목");
  await expect(page.getByTestId("save-state")).toHaveAttribute("data-state", "pending");
  await page.reload();
  await expect(page.getByLabel("노트 제목")).toHaveValue("R01 저장 전 제목");
  await expect(page.getByTestId("note-body")).toContainText("R01 마지막 입력");
  await saved(page);
  expect(await page.evaluate(() => Object.keys(localStorage).filter((key) => key.startsWith("amu-note:draft:")))).toEqual([]);
  await page.reload();
  await expect(page.getByTestId("note-body")).toContainText("R01 마지막 입력");
});

test("R01: 다른 일반 문서로 바로 이동했다 돌아와도 초안이 섞이지 않는다", async ({ page }) => {
  await signUpAndEnter(page);
  await createDocNote(page);
  await page.getByLabel("노트 제목").fill("R01 이동 대상");
  await page.getByTestId("note-body").fill("대상 노트 원문");
  await saved(page);
  const destination = page.url();
  await createDocNote(page);
  await expect(page).not.toHaveURL(destination);
  await page.getByLabel("노트 제목").fill("R01 출발 노트");
  await page.getByTestId("note-body").fill("출발 노트 원문");
  await saved(page);
  const origin = page.url();
  await page.getByTestId("note-body").fill("이동 직전 마지막 입력");
  await page.getByTestId("note-item").filter({ hasText: "R01 이동 대상" }).click();
  await expect(page).toHaveURL(destination);
  await expect(page.getByTestId("note-body")).toContainText("대상 노트 원문");
  await page.getByTestId("note-item").filter({ hasText: "R01 출발 노트" }).click();
  await expect(page).toHaveURL(origin);
  await expect(page.getByTestId("note-body")).toContainText("이동 직전 마지막 입력");
  await saved(page);
});

test("R01: Markdown의 마지막 입력도 새로고침 후 복구해 서버에 저장한다", async ({ page }) => {
  await signUpAndEnter(page);
  await createFormat(page, "Markdown");
  await page.getByTestId("note-body").fill("# 저장 전 Markdown\n\n- 마지막 항목");
  await page.getByLabel("노트 제목").fill("R01 Markdown");
  await expect(page.getByTestId("save-state")).toHaveAttribute("data-state", "pending");
  await page.reload();
  await expect(page.getByTestId("note-body")).toHaveValue("# 저장 전 Markdown\n\n- 마지막 항목");
  await expect(page.getByLabel("노트 제목")).toHaveValue("R01 Markdown");
  await saved(page);
});

test("R01: 그림판 탭을 저장 대기 중 닫아도 다시 열면 요소와 제목이 남는다", async ({ page }) => {
  await signUpAndEnter(page);
  await createFormat(page, "그림판");
  const paper = page.getByTestId("note-body");
  await expect.poll(async () => (await paper.boundingBox())?.width ?? 0).toBeGreaterThan(600);
  const box = (await paper.boundingBox())!;
  await page.mouse.move(box.x + 60, box.y + 60);
  await page.mouse.down();
  await page.mouse.move(box.x + 180, box.y + 140, { steps: 4 });
  await page.mouse.up();
  await expect(page.getByTestId("canvas-element")).toHaveCount(1);
  await page.getByLabel("노트 제목").fill("R01 그림판");
  await expect(page.getByTestId("save-state")).toHaveAttribute("data-state", "pending");
  const url = page.url();
  const context = page.context();
  await page.close();
  const reopened = await context.newPage();
  await reopened.goto(url);
  await expect(reopened.getByTestId("canvas-element")).toHaveCount(1);
  await expect(reopened.getByLabel("노트 제목")).toHaveValue("R01 그림판");
  await saved(reopened);
});

test("R01: 복구할 초안보다 서버 버전이 앞서면 덮지 않고 선택을 기다린다", async ({ page, browser }) => {
  const username = await signUpAndEnter(page);
  await createDocNote(page);
  await page.getByTestId("note-body").fill("처음 저장한 원문");
  await saved(page);
  const url = page.url();
  const otherContext = await browser.newContext({ locale: "ko-KR" });
  const other = await otherContext.newPage();
  await signInAndEnter(other, username);
  await other.goto(url);
  await expect(other.getByTestId("note-body")).toContainText("처음 저장한 원문");
  await page.getByTestId("note-body").fill("이 브라우저에만 남긴 초안");
  await page.goto("/");
  await other.getByTestId("note-body").fill("다른 기기에서 저장한 최신 원문");
  await saved(other);
  await page.goto(url);
  await expect(page.getByTestId("note-body")).toContainText("이 브라우저에만 남긴 초안");
  await expect(page.getByRole("button", { name: "최신 내용 불러오기" })).toBeVisible();
  await expect(page.getByTestId("save-state")).toHaveAttribute("data-state", "conflict");
  await expect(page.getByTestId("save-state")).toContainText("충돌 해결 대기");
  await expect(page.getByTestId("save-state")).toContainText("초안은 이 기기에 보관됨 · 서버 저장 미확인");
  await other.reload();
  await expect(other.getByTestId("note-body")).toContainText("다른 기기에서 저장한 최신 원문");
  await page.getByRole("button", { name: "최신 내용 불러오기" }).click();
  await expect(page.getByTestId("note-body")).toContainText("다른 기기에서 저장한 최신 원문");
  await page.reload();
  await expect(page.getByTestId("note-body")).toContainText("다른 기기에서 저장한 최신 원문");
  await otherContext.close();
});
