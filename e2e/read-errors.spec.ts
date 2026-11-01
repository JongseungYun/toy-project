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

test("R06: 이력 목록·본문 조회와 복원 실패를 구분하고 재시도한다", async ({ page, next }) => {
  await createDocNote(page);
  await expect(page.getByTestId("note-body")).toBeVisible();
  for (const title of ["복원할 내용", "현재 내용"]) {
    const count = (await page.getByTestId("save-state").getAttribute("data-saved-count"))!;
    await page.getByLabel("노트 제목").fill(title);
    await page.getByTestId("note-body").fill(`${title}의 본문`);
    await expect(page.getByTestId("save-state")).not.toHaveAttribute("data-saved-count", count, { timeout: 20_000 });
    await expect(page.getByTestId("save-state")).toHaveAttribute("data-state", "saved");
  }
  let stage = "list";
  let failures = 0;
  next.onFetch((request) => {
    const url = new URL(request.url);
    const detail = url.searchParams.get("select")?.includes("content");
    if ((url.pathname === "/rest/v1/note_revisions" && ((stage === "list" && !detail) || (stage === "detail" && detail))) ||
      (stage === "restore" && url.pathname === "/rest/v1/rpc/restore_note_revision")) {
      failures++;
      return Response.json({ message: "R06 test only" }, { status: 503 });
    }
  });
  await page.getByRole("button", { name: "수정 이력", exact: true }).click();
  const dialog = page.getByRole("dialog");
  await expect(dialog).toContainText("이력을 불러오지 못했습니다.", { timeout: 30_000 });
  await expect(dialog).not.toContainText("아직 수정 이력이 없어요");
  stage = "detail";
  await dialog.getByRole("button", { name: "다시 불러오기", exact: true }).click();
  await expect(page.getByLabel("복원 지점")).toBeVisible();
  await expect(dialog).toContainText("이력을 불러오지 못했습니다.", { timeout: 30_000 });
  stage = "restore";
  await dialog.getByRole("button", { name: "다시 불러오기", exact: true }).click();
  await expect(page.getByTestId("revision-preview")).toContainText("복원할 내용의 본문");
  await dialog.getByRole("button", { name: "이 버전 복원", exact: true }).click();
  await dialog.getByRole("button", { name: "복원하기", exact: true }).click();
  await expect(dialog).toContainText("복원하지 못했습니다.");
  await expect(page.getByLabel("노트 제목")).toHaveValue("현재 내용");
  await expect(page.getByTestId("save-state")).toHaveAttribute("data-state", "saved");
  expect(failures).toBeGreaterThanOrEqual(3);
  stage = "recovered";
  await dialog.getByRole("button", { name: "이 버전 복원", exact: true }).click();
  await dialog.getByRole("button", { name: "복원하기", exact: true }).click();
  await expect(dialog).toHaveCount(0);
  await expect(page.getByLabel("노트 제목")).toHaveValue("복원할 내용");
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

test("R04: 검색 실패는 결과 없음과 구분하고 같은 검색어로 재시도한다", async ({ page, next }) => {
  await createDocNote(page);
  await page.getByTestId("note-body").fill("검색실패 복구 확인");
  await expect(page.getByTestId("save-state")).not.toHaveAttribute("data-saved-count", "0", { timeout: 20_000 });
  const fault = failReads(next, (url) => url.pathname === "/rest/v1/notes" && url.searchParams.get("select")?.includes("content") === true);
  await page.goto(`/search?q=${encodeURIComponent("검색실패")}`);
  const failure = page.getByTestId("search-failure");
  await expect(failure).toContainText("검색하지 못했어요");
  await expect(page.getByTestId("search-empty")).toHaveCount(0);
  const before = fault.count();
  await failure.getByRole("button", { name: "다시 시도", exact: true }).click();
  await expect(failure.getByRole("button", { name: "다시 시도", exact: true })).toBeEnabled({ timeout: 30_000 });
  expect(fault.count()).toBeGreaterThan(before);
  fault.recover();
  await failure.getByRole("button", { name: "다시 시도", exact: true }).click();
  await expect(page.getByTestId("search-result")).toHaveCount(1);
  await expect(page.getByRole("searchbox")).toHaveValue("검색실패");
});

test("R04: 첫 조회 묶음 뒤에 있는 노트도 검색한다", async ({ page, next }) => {
  let secondPage = false;
  next.onFetch((request) => {
    const url = new URL(request.url);
    if (request.method !== "GET" || url.pathname !== "/rest/v1/notes" || !url.searchParams.get("select")?.includes("content")) return;
    const offset = Number(url.searchParams.get("offset") ?? 0);
    if (offset >= 200) secondPage = true;
    return Response.json(Array.from({ length: offset === 0 ? 200 : 1 }, (_, index) => ({
      id: randomUUID(), format: "doc", title: offset === 0 ? `기타 ${index}` : "마지막 묶음",
      content: { html: offset === 0 ? "<p>다른 내용</p>" : "<p>다음묶음검색</p>" },
      folder_id: null, updated_at: "2026-10-30T00:00:00Z",
    })));
  });
  await page.goto(`/search?q=${encodeURIComponent("다음묶음검색")}`);
  await expect(page.getByTestId("search-result")).toHaveCount(1);
  await expect(page.getByTestId("search-result")).toContainText("마지막 묶음");
  expect(secondPage).toBe(true);
});

test("R05: 고정 저장 실패를 표시하고 같은 버튼으로 다시 시도한다", async ({ page, next }) => {
  await createDocNote(page);
  await expect(page.getByTestId("note-body")).toBeVisible();
  let failing = true;
  next.onFetch(async (request) => {
    const url = new URL(request.url);
    if (request.method === "PATCH" && url.pathname === "/rest/v1/notes" && failing) {
      const body = await request.clone().json();
      if ("is_pinned" in body) return Response.json({ code: "TEST_PIN_FAILURE" }, { status: 503 });
    }
  });
  const actions = page.getByTestId("note-actions");
  await actions.getByRole("button", { name: "노트 고정", exact: true }).click();
  await expect(actions.getByRole("alert")).toContainText("고정 상태를 저장하지 못했어요");
  await expect(actions.getByRole("button", { name: "노트 고정", exact: true })).toHaveAttribute("aria-pressed", "false");
  failing = false;
  await actions.getByRole("button", { name: "노트 고정", exact: true }).click();
  await expect(actions.getByRole("button", { name: "고정 해제", exact: true })).toHaveAttribute("aria-pressed", "true");
  await expect(actions.getByRole("alert")).toHaveCount(0);
});

test("R05: 전체 보기 조회 실패는 빈 목록과 구분하고 같은 보기·정렬로 복구한다", async ({ page, next }) => {
  const fault = failReads(next, (url) => url.pathname === "/rest/v1/notes");
  await page.goto("/?view=all&sort=title&dir=asc");
  const failure = page.getByTestId("read-failure");
  await expect(failure).toBeVisible();
  expect(fault.count()).toBeGreaterThan(0);
  fault.recover();
  await failure.getByRole("button", { name: "다시 시도", exact: true }).click();
  await expect(failure).toHaveCount(0);
  await expect(page.getByRole("button", { name: "전체 노트", exact: true })).toHaveAttribute("aria-pressed", "true");
  await expect(page).toHaveURL(/view=all&sort=title&dir=asc$/);
});

test("R05: 전체 보기는 첫 조회 묶음 뒤의 노트까지 표시한다", async ({ page, next }) => {
  let secondPage = false;
  next.onFetch((request) => {
    const url = new URL(request.url);
    if (request.method !== "GET" || url.pathname !== "/rest/v1/notes" || !url.searchParams.get("select")?.includes("is_pinned")) return;
    const offset = Number(url.searchParams.get("offset") ?? 0);
    if (offset >= 200) secondPage = true;
    return Response.json(Array.from({ length: offset === 0 ? 200 : 1 }, (_, index) => ({
      id: randomUUID(), format: "doc", title: offset === 0 ? `기록 ${index}` : "마지막 묶음 노트",
      preview: "", version: 1, folder_id: null, is_pinned: false, background: null,
      created_at: "2026-11-01T00:00:00Z", updated_at: "2026-11-01T00:00:00Z",
    })));
  });
  await page.goto("/?view=all");
  await expect(page.getByTestId("note-item")).toHaveCount(201);
  await expect(page.getByTestId("note-item").last()).toContainText("마지막 묶음 노트");
  expect(secondPage).toBe(true);
});
