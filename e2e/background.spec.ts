import { expect, test, type APIRequestContext, type Page } from "@playwright/test";
import "./support/load-env";
import { TEST_PASSWORD, signUpAndEnter, uniqueUsername } from "./support/account";

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const SUPABASE_KEY = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!;
const BUCKET = "note-backgrounds";

const CREAM = "rgb(255, 250, 240)";
const PALE_BLUE = "rgb(238, 243, 251)";

// 1x1 PNG. 실제 이미지여야 버킷의 형식 검사를 통과한다.
const PNG = Buffer.from(
  "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==",
  "base64",
);

async function createNote(page: Page, format: string) {
  await page.getByRole("button", { name: "새 노트 만들기" }).first().click();
  // 형식 카드는 이름 아래에 설명까지 담고 있어 exact로는 잡히지 않는다.
  await page.getByRole("button", { name: format }).click();
  await page.waitForURL(/\/notes\//);
}

/** 배경 popover를 열고 색을 고른다. 서버에 저장될 때까지 기다린다. */
async function pickColor(page: Page, label: string, expected: string) {
  await page.getByRole("button", { name: "배경 바꾸기" }).click();
  await page.getByRole("button", { name: label, exact: true }).click();
  await expect(surfaceOf(page)).toHaveCSS("background-color", expected);
}

function surfaceOf(page: Page) {
  return page.getByTestId("note-body");
}

test("노트마다 배경 색을 고를 수 있고 다시 열었을 때 유지된다", async ({ page }) => {
  await signUpAndEnter(page);
  await createNote(page, "일반 문서");

  await pickColor(page, "크림", CREAM);

  await page.reload();
  await expect(surfaceOf(page)).toHaveCSS("background-color", CREAM);
});

test("세 형식 모두에서 배경이 동작한다", async ({ page }) => {
  await signUpAndEnter(page);

  for (const format of ["일반 문서", "Markdown", "그림판"]) {
    await page.goto("/");
    await createNote(page, format);
    await pickColor(page, "연한 파랑", PALE_BLUE);
    await page.reload();
    await expect(surfaceOf(page)).toHaveCSS("background-color", PALE_BLUE);
  }
});

test("배경 이미지를 올려 쓸 수 있고 다시 열었을 때 유지된다", async ({ page }) => {
  await signUpAndEnter(page);
  await createNote(page, "일반 문서");

  await page.getByRole("button", { name: "배경 바꾸기" }).click();
  await page.getByLabel("배경 이미지 파일").setInputFiles({
    name: "background.png",
    mimeType: "image/png",
    buffer: PNG,
  });

  // 올라간 이미지가 서명된 주소로 배경에 깔린다
  await expect(surfaceOf(page)).toHaveCSS(
    "background-image",
    /url\(".*note-backgrounds.*"\)/,
    { timeout: 20_000 },
  );

  await page.reload();
  await expect(surfaceOf(page)).toHaveCSS(
    "background-image",
    /url\(".*note-backgrounds.*"\)/,
  );
  // 사진 위에도 글자가 읽히도록 흰 막이 한 겹 깔린다
  await expect(surfaceOf(page)).toHaveCSS("background-image", /linear-gradient/);
});

test("허용하지 않는 형식과 크기를 넘는 파일은 올라가지 않고 이유를 알린다", async ({
  page,
}) => {
  await signUpAndEnter(page);
  await createNote(page, "일반 문서");

  await page.getByRole("button", { name: "배경 바꾸기" }).click();
  const input = page.getByLabel("배경 이미지 파일");

  await input.setInputFiles({
    name: "animation.gif",
    mimeType: "image/gif",
    buffer: Buffer.from("GIF89a"),
  });
  await expect(page.getByTestId("background-problem")).toHaveText(
    "JPG와 PNG만 올릴 수 있습니다.",
  );

  await input.setInputFiles({
    name: "huge.png",
    mimeType: "image/png",
    buffer: Buffer.alloc(5 * 1024 * 1024 + 1),
  });
  await expect(page.getByTestId("background-problem")).toHaveText(
    "5MB까지 올릴 수 있습니다.",
  );

  // 어느 쪽도 배경이 되지 않았다
  await expect(surfaceOf(page)).not.toHaveCSS("background-image", /url\(/);
});

test("올린 배경 이미지를 다른 사용자와 로그인하지 않은 사람이 가져갈 수 없다", async ({
  page,
  request,
}) => {
  test.skip(!SUPABASE_URL || !SUPABASE_KEY, "Supabase 환경 변수가 설정되어 있지 않다");

  await signUpAndEnter(page);
  await createNote(page, "일반 문서");
  await page.getByRole("button", { name: "배경 바꾸기" }).click();
  await page.getByLabel("배경 이미지 파일").setInputFiles({
    name: "background.png",
    mimeType: "image/png",
    buffer: PNG,
  });
  await expect(surfaceOf(page)).toHaveCSS(
    "background-image",
    /url\(".*note-backgrounds.*"\)/,
    { timeout: 20_000 },
  );

  // 올라간 파일의 경로를 저장된 값에서 그대로 읽는다
  const path = await page.evaluate(async () => {
    const match = document
      .querySelector<HTMLElement>('[data-testid="note-body"]')!
      .style.backgroundImage.match(/note-backgrounds\/([^?"]+)/);
    return match?.[1] ?? null;
  });
  expect(path).toBeTruthy();

  const objectUrl = `${SUPABASE_URL}/storage/v1/object/${BUCKET}/${path}`;

  // 로그인하지 않은 상태로는 가져갈 수 없다
  const asAnon = await request.get(objectUrl, { headers: { apikey: SUPABASE_KEY } });
  expect(asAnon.ok()).toBe(false);

  // 다른 계정의 토큰으로도 가져갈 수 없다
  const other = await signUpViaApi(request, uniqueUsername("bgother"));
  const asOtherUser = await request.get(objectUrl, {
    headers: { apikey: SUPABASE_KEY, Authorization: `Bearer ${other.accessToken}` },
  });
  expect(asOtherUser.ok()).toBe(false);
});

test("기본 배경을 바꾼 뒤 만든 노트만 그 배경으로 시작한다", async ({ page }) => {
  await signUpAndEnter(page);

  // 기본 배경을 바꾸기 전에 만든 노트
  await createNote(page, "일반 문서");
  const before = page.url();
  await expect(surfaceOf(page)).toHaveCSS("background-color", "rgb(255, 255, 255)");

  await page.goto("/settings");
  await page.getByRole("button", { name: "기본 배경 고르기" }).click();
  await page.getByRole("button", { name: "크림", exact: true }).click();
  await expect(page.getByLabel("지금 기본 배경: 크림")).toBeVisible({
    timeout: 20_000,
  });

  // 그 뒤에 만든 노트는 크림으로 시작한다
  await page.goto("/");
  await createNote(page, "일반 문서");
  await expect(surfaceOf(page)).toHaveCSS("background-color", CREAM);

  // 이미 만든 노트는 그대로다
  await page.goto(before);
  await expect(surfaceOf(page)).toHaveCSS("background-color", "rgb(255, 255, 255)");
});

async function signUpViaApi(request: APIRequestContext, username: string) {
  const response = await request.post(`${SUPABASE_URL}/auth/v1/signup`, {
    headers: { apikey: SUPABASE_KEY, "Content-Type": "application/json" },
    data: {
      email: `${username}@users.amunote.internal`,
      password: TEST_PASSWORD,
      data: { username },
    },
  });
  expect(response.ok()).toBe(true);
  const body = await response.json();
  return { accessToken: body.access_token as string };
}
