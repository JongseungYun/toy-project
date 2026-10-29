import { expect, test, type Page } from "@playwright/test";
import { createDocNote, signUpAndEnter } from "./support/account";

const SAVED = { timeout: 20_000 };
async function openSavedNote(page: Page) {
  await signUpAndEnter(page);
  await createDocNote(page);
  await page.getByTestId("note-body").fill("R02 처음 저장한 내용");
  await expect(page.getByTestId("save-state")).not.toHaveAttribute("data-saved-count", "0", SAVED);
}

test("R02: 저장 요청 실패 시 기기 초안과 서버 저장 미확인을 알리고 재시도 후 저장한다", async ({ page }) => {
  await openSavedNote(page);
  await page.route("**/notes/**", (route) => route.request().method() === "POST"
    && route.request().headers()["next-action"] ? route.abort("failed") : route.continue());
  const state = page.getByTestId("save-state");
  const before = await state.getAttribute("data-saved-count");
  await page.getByTestId("note-body").fill("연결 예외 뒤에도 남아야 하는 마지막 입력");
  await expect(state).toHaveAttribute("data-state", "error", SAVED);
  await expect(state).toContainText("초안은 이 기기에 보관됨 · 서버 저장 미확인");
  await expect(state).not.toContainText("저장됨 ·");
  await expect(page.getByTestId("note-body")).toContainText("마지막 입력");
  await page.unroute("**/notes/**");
  await state.getByRole("button").click();
  await expect(state).not.toHaveAttribute("data-saved-count", before ?? "0", SAVED);
  await expect(state).toHaveAttribute("data-state", "saved");
  await page.reload();
  await expect(page.getByTestId("note-body")).toContainText("연결 예외 뒤에도 남아야 하는 마지막 입력");
});

test("R02: 연결 끊김 중 초안을 보관하고 재연결 뒤 사용자가 재시도한다", async ({ page, context }) => {
  await openSavedNote(page);
  const state = page.getByTestId("save-state");
  const before = await state.getAttribute("data-saved-count");
  await context.setOffline(true);
  await page.getByTestId("note-body").fill("연결 끊김 중 입력한 내용");
  await expect(state).toHaveAttribute("data-state", "offline");
  await expect(state).toContainText("연결 끊김");
  await expect(state).toContainText("초안은 이 기기에 보관됨 · 서버 저장 미확인");
  await expect(state).not.toContainText("저장됨 ·");
  await context.setOffline(false);
  await expect(state).toHaveAttribute("data-state", "error");
  await expect(state).toHaveAttribute("data-saved-count", before ?? "0");
  await state.getByRole("button").click();
  await expect(state).not.toHaveAttribute("data-saved-count", before ?? "0", SAVED);
  await expect(state).toHaveAttribute("data-state", "saved");
  await page.reload();
  await expect(page.getByTestId("note-body")).toContainText("연결 끊김 중 입력한 내용");
});
