import { readFileSync } from "node:fs";
import { expect, test, type Page } from "@playwright/test";
import { createDocNote, signUpAndEnter } from "./support/account";

const SAVED = { timeout: 20_000 };

/** 노트에 글을 쓰고 저장이 끝날 때까지 기다린다. 공유 화면은 저장된 것을 읽는다. */
async function writeAndSave(page: Page, text: string) {
  await page.getByTestId("note-body").click();
  await page.keyboard.type(text);
  await expect(page.getByTestId("note-body")).toContainText(text);
  // 초기에도 saved이므로, 저장 성공 후 새로 그려지는 목록으로 확인한다.
  await expect(page.getByTestId("note-item").filter({ hasText: text })).toBeVisible(SAVED);
}

test("읽기 전용 링크로 공유하고, 끄면 그 링크가 닫힌다", async ({ page, browser }) => {
  await signUpAndEnter(page);
  await createDocNote(page);
  await writeAndSave(page, "공유할 회의록");

  await page.getByRole("button", { name: "공유", exact: true }).click();
  await page.getByTestId("start-sharing").click();

  const link = await page.getByTestId("share-link").inputValue(SAVED);
  expect(link).toContain("/share/");

  // 로그인하지 않은 다른 브라우저에서 열린다
  const guest = await browser.newContext({ locale: "ko-KR" });
  const guestPage = await guest.newPage();
  await guestPage.goto(link);

  await expect(guestPage.getByTestId("shared-body")).toContainText("공유할 회의록");
  await expect(guestPage.getByText("읽기 전용")).toBeVisible();
  // 로그인 화면으로 내보내지 않는다
  expect(guestPage.url()).toContain("/share/");
  // 고칠 수 있는 자리는 없다
  await expect(guestPage.getByTestId("note-body")).toHaveCount(0);

  // 공유를 끄면 같은 링크가 더 이상 열리지 않는다
  await page.getByRole("button", { name: "공유 중지" }).click();
  await expect(page.getByTestId("start-sharing")).toBeVisible(SAVED);

  await guestPage.reload();
  await expect(guestPage.getByText("열 수 없는 링크입니다")).toBeVisible();
  await expect(guestPage.getByTestId("shared-body")).toHaveCount(0);

  await guest.close();
});

test("없는 링크는 존재 여부를 알리지 않고 같은 화면을 보여준다", async ({ browser }) => {
  const guest = await browser.newContext({ locale: "ko-KR" });
  const guestPage = await guest.newPage();

  // 열쇠 모양이지만 없는 것, 열쇠 모양도 아닌 것 모두 같은 화면이다
  for (const token of ["3f2a1b7c-5d6e-4f80-9a1b-2c3d4e5f6071", "not-a-token"]) {
    await guestPage.goto(`/share/${token}`);
    await expect(guestPage.getByText("열 수 없는 링크입니다")).toBeVisible();
  }

  await guest.close();
});

test("일반 문서를 서식이 살아 있는 HTML 파일로 내보낸다", async ({ page }) => {
  await signUpAndEnter(page);
  await createDocNote(page);
  await page.getByTestId("note-body").click();
  await page.keyboard.type("내보낼 회의록");

  const downloading = page.waitForEvent("download");
  await page.getByTestId("export-note").click();
  const download = await downloading;

  expect(download.suggestedFilename()).toBe("내보낼 회의록.html");

  const file = readFileSync((await download.path())!, "utf-8");
  expect(file).toContain("내보낼 회의록");
  expect(file).toContain("<!doctype html>");
});

test("Markdown은 저장 전의 원문도 MD 파일로 내보낸다", async ({ page }) => {
  await signUpAndEnter(page);
  await page.getByRole("button", { name: "새 노트 만들기" }).first().click();
  await page.getByRole("button", { name: "Markdown" }).click();
  await page.waitForURL(/\/notes\//);
  const source = "# 내보낼 Markdown\n\n- 저장 전 원문";
  await page.getByTestId("note-body").fill(source);
  const downloading = page.waitForEvent("download");
  await page.getByTestId("export-note").click();
  const download = await downloading;
  expect(download.suggestedFilename()).toBe("내보낼 Markdown.md");
  expect(readFileSync((await download.path())!, "utf-8")).toBe(source);
});

test("그림판은 그린 도형을 그대로 담은 SVG 파일로 내보낸다", async ({ page }) => {
  await signUpAndEnter(page);
  await page.getByRole("button", { name: "새 노트 만들기" }).first().click();
  await page.getByRole("button", { name: "그림판" }).click();
  await page.waitForURL(/\/notes\//);

  // 그림면 위에 선 하나를 긋는다
  const surface = page.getByTestId("note-body");
  const box = (await surface.boundingBox())!;
  await page.mouse.move(box.x + 40, box.y + 40);
  await page.mouse.down();
  await page.mouse.move(box.x + 160, box.y + 120, { steps: 8 });
  await page.mouse.up();
  await expect(page.getByTestId("canvas-element")).toHaveCount(1);

  const downloading = page.waitForEvent("download");
  await page.getByTestId("export-note").click();
  const download = await downloading;

  expect(download.suggestedFilename()).toContain(".svg");

  const file = readFileSync((await download.path())!, "utf-8");
  expect(file).toContain('xmlns="http://www.w3.org/2000/svg"');
  expect(file).toContain("<polyline");
  expect(file).toContain('stroke-width=');
});
