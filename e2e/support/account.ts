import type { Page } from "@playwright/test";

// 태스크 01 e2e에서 공유하는 계정 관련 헬퍼.
// 아이디는 테스트마다 겹치지 않도록 매번 새로 만든다.

export const TEST_PASSWORD = "Gureum2026!";

export function uniqueUsername(prefix = "e2e") {
  const suffix = `${Date.now().toString(36)}${Math.floor(Math.random() * 1000)}`;
  return `${prefix}${suffix}`.toLowerCase().slice(0, 20);
}

/** 새 계정을 만들어 보관함까지 들어간다. 노트 관련 e2e의 공통 출발점이다. */
export async function signUpAndEnter(page: Page, username = uniqueUsername()) {
  await page.goto("/signup");
  await page.getByLabel("아이디").fill(username);
  await page.getByLabel("비밀번호", { exact: true }).fill(TEST_PASSWORD);
  await page.getByLabel("비밀번호 확인").fill(TEST_PASSWORD);
  await page.getByRole("button", { name: "가입하고 시작하기" }).click();
  await page.waitForURL("/");
  return username;
}

/** 이미 있는 계정으로 들어간다. 같은 계정을 두 기기에서 여는 상황에 쓴다. */
export async function signInAndEnter(page: Page, username: string) {
  await page.goto("/login");
  await page.getByLabel("아이디").fill(username);
  await page.getByLabel("비밀번호").fill(TEST_PASSWORD);
  await page.getByRole("button", { name: "로그인" }).click();
  await page.waitForURL("/");
}

/** 형식 선택 창에서 일반 문서를 골라 빈 노트를 연다. */
export async function createDocNote(page: Page) {
  await page.getByRole("button", { name: "새 노트 만들기" }).first().click();
  await page.getByRole("button", { name: "일반 문서" }).click();
  await page.waitForURL(/\/notes\//);
}
