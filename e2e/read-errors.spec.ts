import { expect, test, type NextFixture } from "next/experimental/testmode/playwright";
import { randomUUID } from "node:crypto";
import { createDocNote, signUpAndEnter } from "./support/account";

/** 실제 서버의 Supabase 조회 응답을 바꿔 실패와 복구를 확인한다. */
function failReads(next: NextFixture, matches: (url: URL) => boolean) {
  let failing = true;
  let intercepted = 0;
  next.onFetch((request) => {
    const url = new URL(request.url);
    if (request.method === "GET" && url.pathname.startsWith("/rest/v1/") && matches(url) && failing) {
      intercepted++;
      return Response.json({ code: "TEST_READ_FAILURE", message: "read test only" }, { status: 503 });
    }
  });
  return { recover: () => { failing = false; }, count: () => intercepted };
}

test.beforeEach(async ({ page, next }) => {
  // 정상 요청은 테스트 프로세스에서 실제 서버로 보내고 응답을 그대로 돌려준다.
  next.onFetch((request) => fetch(request));
  await signUpAndEnter(page);
});

test("R03: 실제 빈 보관함과 없는 노트는 조회 실패와 구분한다", async ({ page }) => {
  await expect(page.getByText("첫 노트를 만들어 보세요", { exact: true })).toBeVisible();
  await expect(page.getByTestId("read-failure")).toHaveCount(0);
  await page.goto(`/notes/${randomUUID()}`);
  await expect(page.getByRole("heading", { name: "404" })).toBeVisible();
  await expect(page.getByTestId("read-failure")).toHaveCount(0);
});

test("R03: 목록 조회 실패를 빈 상태로 숨기지 않고 같은 주소에서 다시 시도한다", async ({ page, next }) => {
  const fault = failReads(next, (url) => url.pathname === "/rest/v1/notes");
  await page.goto("/?sort=title&dir=asc");
  const failure = page.getByTestId("read-failure");
  await expect(failure).toContainText("노트를 불러오지 못했어요");
  await expect(page.getByText("첫 노트를 만들어 보세요", { exact: true })).toHaveCount(0);
  const previousReads = fault.count();
  await failure.getByRole("button", { name: "다시 시도", exact: true }).click();
  await expect(failure.getByRole("button", { name: "다시 시도", exact: true })).toBeEnabled({ timeout: 30_000 });
  expect(fault.count()).toBeGreaterThan(previousReads);
  fault.recover();
  await failure.getByRole("button", { name: "다시 시도", exact: true }).click();
  await expect(failure).toHaveCount(0);
  await expect(page.getByText("첫 노트를 만들어 보세요", { exact: true })).toBeVisible();
  await expect(page).toHaveURL(/\/\?sort=title&dir=asc$/);
});

test("R03: 본문 조회 실패는 404로 바꾸지 않고 재시도하면 원래 노트를 연다", async ({ page, next }) => {
  await createDocNote(page);
  const noteUrl = page.url();
  const id = new URL(noteUrl).pathname.split("/").pop();
  const fault = failReads(next, (url) => url.pathname === "/rest/v1/notes" && url.searchParams.get("id") === `eq.${id}`);
  await page.reload();
  const failure = page.getByTestId("read-failure");
  await expect(failure).toBeVisible();
  await expect(page.getByRole("heading", { name: "404" })).toHaveCount(0);
  expect(fault.count()).toBeGreaterThan(0);
  fault.recover();
  await failure.getByRole("button", { name: "다시 시도", exact: true }).click();
  await expect(page.getByTestId("note-body")).toBeVisible();
  await expect(failure).toHaveCount(0);
  await expect(page).toHaveURL(noteUrl);
});

for (const source of ["목록", "경로", "개수"] as const) {
  test(`R03: 폴더 ${source} 조회 실패도 재시도할 수 있다`, async ({ page, next }) => {
    const folderId = randomUUID();
    const fault = failReads(next, (url) => {
      if (url.pathname !== "/rest/v1/folders") return false;
      const select = url.searchParams.get("select");
      if (source === "경로") return select === "id,name,parent_id";
      if (source === "개수") return select === "parent_id";
      return select?.includes("created_at") ?? false;
    });
    // 개수 조회까지 도달하도록 테스트 응답에만 폴더 하나를 둔다.
    if (source === "개수") {
      next.onFetch((request) => {
        const url = new URL(request.url);
        if (url.pathname === "/rest/v1/folders" && url.searchParams.get("select")?.includes("created_at")) {
          return Response.json([{ id: folderId, name: "조회 테스트", parent_id: null, created_at: "2026-10-29", updated_at: "2026-10-29" }]);
        }
      });
    }
    await page.goto(source === "경로" ? `/?folder=${folderId}` : "/");
    const failure = page.getByTestId("read-failure");
    await expect(failure).toBeVisible();
    expect(fault.count()).toBeGreaterThan(0);
    fault.recover();
    await failure.getByRole("button", { name: "다시 시도", exact: true }).click();
    await expect(failure).toHaveCount(0);
    await expect(page.getByRole("button", { name: "새 노트 만들기" }).first()).toBeVisible();
  });
}

test("R03: 휴지통 조회 실패를 빈 휴지통으로 표시하지 않는다", async ({ page, next }) => {
  const fault = failReads(next, (url) => url.searchParams.get("deleted_at") === "not.is.null");
  await page.goto("/trash");
  const failure = page.getByTestId("read-failure");
  await expect(failure).toBeVisible();
  expect(fault.count()).toBeGreaterThan(0);
  fault.recover();
  await failure.getByRole("button", { name: "다시 시도", exact: true }).click();
  await expect(failure).toHaveCount(0);
  await expect(page).toHaveURL(/\/trash$/);
  await expect(page.getByText("휴지통이 비었습니다", { exact: true })).toBeVisible();
});
