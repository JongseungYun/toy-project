import {
  expect,
  test,
  type Page,
  type APIRequestContext,
} from "@playwright/test";
import {
  createDocNote,
  signUpAndEnter,
  signInAndEnter,
  uniqueUsername,
  TEST_PASSWORD,
} from "./support/account";

async function saved(page: Page, before = "0") {
  await expect(page.getByTestId("save-state")).not.toHaveAttribute(
    "data-saved-count",
    before,
    { timeout: 20_000 },
  );
  await expect(page.getByTestId("save-state")).toHaveAttribute(
    "data-state",
    "saved",
  );
}

async function folder(page: Page, name: string) {
  await page.getByRole("button", { name: "새 폴더", exact: true }).click();
  await page.getByLabel("폴더 이름").fill(name);
  await page.getByRole("button", { name: "만들기", exact: true }).click();
  await page.getByTestId("folder-item").filter({ hasText: name }).click();
  await expect(
    page.getByRole("navigation", { name: "폴더 경로" }),
  ).toContainText(name);
}

const row = (page: Page, title: string) =>
  page.getByTestId("note-row").filter({ hasText: title });
const header = (page: Page) => page.getByTestId("note-actions");

test("R05: 전체 보기는 폴더를 가로질러 노트와 원래 경로를 보여준다", async ({
  page,
}) => {
  test.setTimeout(150_000);
  await signUpAndEnter(page);
  await createDocNote(page);
  await page.getByLabel("노트 제목").fill("보관함 뿌리 노트");
  await expect(page.getByTestId("save-state")).not.toHaveAttribute(
    "data-saved-count",
    "0",
    { timeout: 20_000 },
  );
  await page.goto("/");
  await folder(page, "업무 폴더");
  await folder(page, "2026");
  await page.getByRole("button", { name: "새 노트 만들기" }).first().click();
  await page.getByRole("button", { name: "Markdown" }).click();
  await expect(page.getByTestId("note-body")).toBeVisible();
  await page.getByLabel("노트 제목").fill("폴더 안의 노트");
  await expect(page.getByTestId("save-state")).not.toHaveAttribute(
    "data-saved-count",
    "0",
    { timeout: 20_000 },
  );
  await page.goto("/");
  await page.getByRole("button", { name: "새 노트 만들기" }).first().click();
  await page.getByRole("button", { name: "그림판" }).click();
  await expect(page.getByTestId("note-body")).toBeVisible();
  await page.getByLabel("노트 제목").fill("그림 기록");
  await saved(page);
  await page
    .getByRole("button", { name: "전체 노트", exact: true })
    .click({ timeout: 8_000 });
  await expect(page.getByTestId("note-item")).toHaveCount(3);
  await expect(
    page.getByTestId("note-item").filter({ hasText: "폴더 안의 노트" }),
  ).toContainText("내 노트 / 업무 폴더 / 2026");
  await expect(page.getByTestId("folder-item")).toHaveCount(0);
  await page
    .getByTestId("note-item")
    .filter({ hasText: "폴더 안의 노트" })
    .click();
  await expect(page).toHaveURL(/view=all/);
  await expect(page.getByLabel("노트 제목")).toHaveValue("폴더 안의 노트");
  await expect(page.getByTestId("note-item")).toHaveCount(3);
});

test("R05: 고정 버튼은 노트를 열지 않고 저장하며 정렬과 다른 로그인 세션에서도 유지된다", async ({
  page,
  browser,
}) => {
  const username = await signUpAndEnter(page);
  for (const title of ["다 기록", "가 기록", "나 기록"]) {
    await page.goto("/");
    await createDocNote(page);
    await page.getByLabel("노트 제목").fill(title);
    await saved(page);
  }
  await page.getByRole("button", { name: "전체 노트", exact: true }).click();
  await expect(page).toHaveURL(/\/\?.*view=all/);
  await expect(page.getByRole("button", { name: "전체 노트", exact: true })).toHaveAttribute("aria-pressed", "true");
  await page.getByLabel("정렬 기준").click();
  await page
    .getByRole("option", { name: "제목 가나다순", exact: true })
    .click();
  await expect(page.getByTestId("note-item").first()).toContainText("가 기록");
  const url = page.url();
  await row(page, "나 기록")
    .getByRole("button", { name: "노트 고정", exact: true })
    .click();
  await expect(
    row(page, "나 기록").getByRole("button", {
      name: "고정 해제",
      exact: true,
    }),
  ).toHaveAttribute("aria-pressed", "true");
  await expect(page).toHaveURL(url);
  await expect(page.getByTestId("note-item").nth(0)).toContainText("나 기록");
  await expect(page.getByTestId("note-item").nth(1)).toContainText("가 기록");
  await expect(page.getByTestId("note-item").nth(2)).toContainText("다 기록");
  await page.getByRole("button", { name: "폴더별", exact: true }).click();
  await expect(page.getByRole("button", { name: "폴더별", exact: true })).toHaveAttribute("aria-pressed", "true");
  await expect(page.getByTestId("note-item").first()).toContainText("나 기록");
  await expect(page.getByTestId("note-item").nth(1)).toContainText("가 기록");
  await page.getByRole("button", { name: "고정한 노트", exact: true }).click();
  await expect(page.getByTestId("note-item")).toHaveCount(1);
  await page.reload();
  await expect(page.getByTestId("note-item")).toContainText("나 기록");
  const other = await browser.newContext({ locale: "ko-KR" });
  try {
    const otherPage = await other.newPage();
    await signInAndEnter(otherPage, username);
    await otherPage
      .getByRole("button", { name: "고정한 노트", exact: true })
      .click();
    await expect(otherPage.getByTestId("note-item")).toHaveCount(1);
    await expect(otherPage.getByTestId("note-item")).toContainText("나 기록");
  } finally {
    await other.close();
  }
  await row(page, "나 기록")
    .getByRole("button", { name: "고정 해제", exact: true })
    .click();
  await expect(page.getByTestId("note-item")).toHaveCount(0);
  await expect(page.getByRole("status")).toContainText("고정한 노트가 없어요");
  await page.getByRole("button", { name: "전체 노트", exact: true }).click();
  await expect(page.getByTestId("note-item")).toHaveCount(3);
  await expect(page.getByTestId("note-item").first()).toContainText("가 기록");
});

test("R05: 편집 도중 고정해도 제목과 본문 초안이 유지되고 다시 열어도 남는다", async ({
  page,
}) => {
  await signUpAndEnter(page);
  await createDocNote(page);
  const body = page.getByTestId("note-body");
  await expect(body).toBeVisible();
  await page.getByLabel("노트 제목").fill("고정 도중 작성한 제목");
  await body.fill("고정 상태를 바꾸어도 작성한 글은 유지됩니다.");
  await header(page)
    .getByRole("button", { name: "노트 고정", exact: true })
    .click();
  await expect(
    header(page).getByRole("button", { name: "고정 해제", exact: true }),
  ).toHaveAttribute("aria-pressed", "true");
  await expect(body).toHaveText("고정 상태를 바꾸어도 작성한 글은 유지됩니다.");
  await saved(page);
  await page.reload();
  await expect(page.getByLabel("노트 제목")).toHaveValue(
    "고정 도중 작성한 제목",
  );
  await expect(body).toHaveText("고정 상태를 바꾸어도 작성한 글은 유지됩니다.");
  await expect(
    header(page).getByRole("button", { name: "고정 해제", exact: true }),
  ).toBeVisible();
});

test("R05: 폴더 이동과 휴지통 복원에도 고정 상태와 경로가 유지된다", async ({
  page,
}) => {
  await signUpAndEnter(page);
  await folder(page, "보관처");
  await page.goto("/");
  await createDocNote(page);
  await page.getByLabel("노트 제목").fill("다시 찾을 노트");
  await saved(page);
  await header(page)
    .getByRole("button", { name: "노트 고정", exact: true })
    .click();
  await expect(
    header(page).getByRole("button", { name: "고정 해제", exact: true }),
  ).toBeVisible();
  await page
    .getByRole("button", { name: "폴더로 옮기기", exact: true })
    .click();
  await page.getByRole("button", { name: "보관처", exact: true }).click();
  await expect(
    page.getByRole("navigation", { name: "폴더 경로" }),
  ).toContainText("보관처");
  await page.getByRole("button", { name: "고정한 노트", exact: true }).click();
  await expect(page.getByTestId("note-item")).toContainText("내 노트 / 보관처");
  await page.getByTestId("note-item").click();
  await page
    .getByRole("button", { name: "휴지통으로 보내기", exact: true })
    .click();
  await page
    .getByRole("alertdialog")
    .getByRole("button", { name: "휴지통으로 보내기", exact: true })
    .click();
  await expect(page).toHaveURL(/localhost:3000\/$/);
  await page.getByRole("button", { name: "고정한 노트", exact: true }).click();
  await expect(page.getByTestId("note-item")).toHaveCount(0);
  await page.goto("/trash");
  await page
    .getByTestId("trash-row")
    .getByRole("button", { name: "되돌리기", exact: true })
    .click();
  await expect(page.getByTestId("trash-row")).toHaveCount(0);
  await page.goto("/?view=pinned");
  await expect(page.getByTestId("note-item")).toHaveCount(1);
  await expect(page.getByTestId("note-item")).toContainText("내 노트 / 보관처");
  await expect(
    row(page, "다시 찾을 노트").getByRole("button", {
      name: "고정 해제",
      exact: true,
    }),
  ).toBeVisible();
});

test("R05: 좁은 화면에서 전체·고정 보기와 정렬을 유지하며 목록으로 돌아간다", async ({
  page,
}) => {
  await signUpAndEnter(page);
  await createDocNote(page);
  await page.getByLabel("노트 제목").fill("모바일 고정 검증");
  await saved(page);
  await header(page)
    .getByRole("button", { name: "노트 고정", exact: true })
    .click();
  await expect(
    header(page).getByRole("button", { name: "고정 해제", exact: true }),
  ).toBeVisible();
  await page.setViewportSize({ width: 390, height: 844 });
  for (const view of ["all", "pinned"]) {
    await page.goto(`/?view=${view}&sort=title&dir=asc`);
    await page.getByTestId("note-item").click();
    await expect(page.getByLabel("노트 제목")).toHaveValue("모바일 고정 검증");
    await expect(page).toHaveURL(
      new RegExp(`view=${view}.*sort=title.*dir=asc`),
    );
    const title = (await page.getByLabel("노트 제목").boundingBox())!;
    expect(title.width).toBeGreaterThan(200);
    await page.getByRole("button", { name: "목록으로", exact: true }).click();
    await expect(page).toHaveURL(
      new RegExp(`sort=title.*dir=asc.*view=${view}`),
    );
    await expect(page.getByTestId("note-item")).toBeVisible();
    const widths = await page
      .locator("aside")
      .evaluate((aside) => ({
        client: aside.clientWidth,
        scroll: aside.scrollWidth,
      }));
    expect(widths.scroll).toBeLessThanOrEqual(widths.client);
  }
});

test("R05: 고정은 본문 버전을 바꾸지 않으며 다른 계정과 비로그인 요청은 수정할 수 없다", async ({
  request,
}) => {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL!;
  const key = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!;
  async function account(client: APIRequestContext) {
    const username = uniqueUsername("pins");
    const response = await client.post(`${url}/auth/v1/signup`, {
      headers: { apikey: key },
      data: {
        email: `${username}@users.amunote.internal`,
        password: TEST_PASSWORD,
        data: { username },
      },
    });
    expect(response.ok()).toBe(true);
    const result = await response.json();
    return {
      id: result.user.id as string,
      headers: {
        apikey: key,
        Authorization: `Bearer ${result.access_token}`,
        Prefer: "return=representation",
      },
    };
  }
  const own = await account(request);
  const other = await account(request);
  const created = await request.post(`${url}/rest/v1/notes`, {
    headers: own.headers,
    data: {
      owner_id: own.id,
      format: "doc",
      title: "내 고정 노트",
      content: { html: "<p>보존할 본문</p>" },
    },
  });
  expect(created.ok()).toBe(true);
  const [initial] = await created.json();
  const endpoint = `${url}/rest/v1/notes?id=eq.${initial.id}`;
  const pinned = await request.patch(endpoint, {
    headers: own.headers,
    data: { is_pinned: true },
  });
  expect(pinned.ok()).toBe(true);
  const [after] = await pinned.json();
  expect(after.is_pinned).toBe(true);
  expect(after.version).toBe(initial.version);
  expect(after.title).toBe("내 고정 노트");
  expect(after.content).toEqual({ html: "<p>보존할 본문</p>" });
  const refused = await request.patch(endpoint, {
    headers: other.headers,
    data: { is_pinned: false },
  });
  expect(await refused.json()).toEqual([]);
  const hidden = await request.get(`${url}/rest/v1/notes?is_pinned=eq.true`, {
    headers: other.headers,
  });
  expect(await hidden.json()).toEqual([]);
  const anonymous = await request.get(endpoint, { headers: { apikey: key } });
  expect(await anonymous.json()).toEqual([]);
  const anonymousWrite = await request.patch(endpoint, {
    headers: { apikey: key, Prefer: "return=representation" },
    data: { is_pinned: false },
  });
  expect([200, 401, 403]).toContain(anonymousWrite.status());
  if (anonymousWrite.ok()) expect(await anonymousWrite.json()).toEqual([]);
  const persisted = await request.get(endpoint, { headers: own.headers });
  expect((await persisted.json())[0].is_pinned).toBe(true);
});
