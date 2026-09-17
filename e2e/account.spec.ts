import { expect, test } from "@playwright/test";
import { TEST_PASSWORD, uniqueUsername } from "./support/account";

test("로그인하지 않으면 보관함 대신 로그인 화면을 만난다", async ({ page }) => {
  await page.goto("/");
  await expect(page).toHaveURL(/\/login$/);
  await expect(page.getByText("아무노트에 로그인")).toBeVisible();
});

test("가입 → 로그아웃 → 로그인 → 새로고침 → 로그아웃 후 접근 차단까지 한 흐름으로 통과한다", async ({
  page,
}) => {
  const username = uniqueUsername();

  await page.goto("/signup");
  await page.getByLabel("아이디").fill(username);
  await page.getByLabel("비밀번호", { exact: true }).fill(TEST_PASSWORD);
  await page.getByLabel("비밀번호 확인").fill(TEST_PASSWORD);
  await page.getByRole("button", { name: "가입하고 시작하기" }).click();

  await expect(page).toHaveURL("/");
  await expect(page.getByText("첫 노트를 만들어 보세요")).toBeVisible();

  await page.getByRole("button", { name: "설정" }).click();
  await expect(page).toHaveURL(/\/settings$/);
  await expect(page.getByText(username)).toBeVisible();
  await page.getByRole("button", { name: "로그아웃" }).click();
  await expect(page).toHaveURL(/\/login$/);

  // 로그아웃 후에는 보관함에 다시 접근할 수 없다
  await page.goto("/");
  await expect(page).toHaveURL(/\/login$/);

  await page.getByLabel("아이디").fill(username);
  await page.getByLabel("비밀번호").fill(TEST_PASSWORD);
  await page.getByRole("button", { name: "로그인" }).click();
  await expect(page).toHaveURL("/");

  // 새로고침 후에도 로그인 상태가 유지된다
  await page.reload();
  await expect(page).toHaveURL("/");
  await expect(page.getByText("첫 노트를 만들어 보세요")).toBeVisible();

  await page.goto("/settings");
  await page.getByRole("button", { name: "로그아웃" }).click();
  await expect(page).toHaveURL(/\/login$/);

  await page.goto("/");
  await expect(page).toHaveURL(/\/login$/);
});

test("로그인 실패 시 아이디와 비밀번호 중 어느 쪽이 틀렸는지 알리지 않는다", async ({ page }) => {
  await page.goto("/login");
  await page.getByLabel("아이디").fill(uniqueUsername("nouser"));
  await page.getByLabel("비밀번호").fill("Wrongpass1!");
  await page.getByRole("button", { name: "로그인" }).click();

  await expect(page.getByText("아이디 또는 비밀번호가 맞지 않습니다.")).toBeVisible();
});

test("중복된 아이디로는 가입할 수 없다", async ({ page }) => {
  const username = uniqueUsername();

  await page.goto("/signup");
  await page.getByLabel("아이디").fill(username);
  await page.getByLabel("비밀번호", { exact: true }).fill(TEST_PASSWORD);
  await page.getByLabel("비밀번호 확인").fill(TEST_PASSWORD);
  await page.getByRole("button", { name: "가입하고 시작하기" }).click();
  await expect(page).toHaveURL("/");

  await page.goto("/settings");
  await page.getByRole("button", { name: "로그아웃" }).click();
  await expect(page).toHaveURL(/\/login$/);

  await page.goto("/signup");
  await page.getByLabel("아이디").fill(username);
  await page.getByRole("button", { name: "중복 확인" }).click();
  await expect(page.getByText("이미 사용 중인 아이디입니다.")).toBeVisible();

  await page.getByLabel("비밀번호", { exact: true }).fill(TEST_PASSWORD);
  await page.getByLabel("비밀번호 확인").fill(TEST_PASSWORD);
  await page.getByRole("button", { name: "가입하고 시작하기" }).click();

  await expect(page).toHaveURL(/\/signup$/);
  await expect(page.getByText("이미 사용 중인 아이디입니다.")).toBeVisible();
});

test("규칙에 어긋난 비밀번호로는 가입할 수 없다", async ({ page }) => {
  await page.goto("/signup");
  await page.getByLabel("아이디").fill(uniqueUsername());
  await page.getByLabel("비밀번호", { exact: true }).fill("weakpass");
  await page.getByLabel("비밀번호 확인").fill("weakpass");
  await page.getByRole("button", { name: "가입하고 시작하기" }).click();

  await expect(page).toHaveURL(/\/signup$/);
  await expect(page.getByText("비밀번호 조건을 모두 만족해야 합니다.")).toBeVisible();
});
