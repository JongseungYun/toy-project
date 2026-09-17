import { expect, test, type Page } from "@playwright/test";
import { createDocNote, signUpAndEnter } from "./support/account";

const SAVED = { timeout: 20_000 };

/** 확인 창의 실행 버튼을 누른다. 여는 버튼과 이름이 같아 창 안으로 좁혀 고른다. */
async function confirmDialog(page: Page, name: string) {
  await page.getByRole("alertdialog").getByRole("button", { name }).click();
}

async function makeFolder(page: Page, name: string) {
  await page.getByRole("button", { name: "새 폴더" }).click();
  await page.getByLabel("폴더 이름").fill(name);
  await page.getByRole("button", { name: "만들기" }).click();
  await expect(page.getByTestId("folder-item").filter({ hasText: name })).toBeVisible(
    SAVED,
  );
}

/**
 * 폴더로 들어간다. Link로 넘어가므로 주소가 바뀐 것을 확인하고 다음으로 간다.
 * 그러지 않으면 아직 이전 폴더를 보여주는 화면에 대고 다음 동작을 하게 된다.
 */
async function openFolder(page: Page, name: string) {
  await page.getByTestId("folder-item").filter({ hasText: name }).click();
  await expect(page).toHaveURL(/folder=/);
  await expect(page.getByRole("navigation", { name: "폴더 경로" })).toContainText(name);
}

/** 노트에 글을 써서 목록에서 알아볼 수 있게 한다. 저장이 끝나면 목록에 뜬다. */
async function writeNote(page: Page, text: string) {
  await page.getByTestId("note-body").click();
  await page.keyboard.type(text);
  await expect(page.getByTestId("note-body")).toContainText(text);
  await expect(
    page.getByTestId("note-item").filter({ hasText: text }).first(),
  ).toBeVisible(SAVED);
}

test("폴더를 만들어 들어가고 경로로 상위에 돌아온다", async ({ page }) => {
  await signUpAndEnter(page);

  await makeFolder(page, "회사 회의록");
  await openFolder(page, "회사 회의록");

  // 폴더 안에 폴더를 둔다
  await makeFolder(page, "2026 3분기");
  await openFolder(page, "2026 3분기");
  const crumbs = page.getByRole("navigation", { name: "폴더 경로" });
  await expect(crumbs).toContainText("내 노트");
  await expect(crumbs).toContainText("회사 회의록");
  await expect(crumbs).toContainText("2026 3분기");

  // 경로에서 상위로 돌아간다
  await crumbs.getByRole("link", { name: "회사 회의록" }).click();
  await expect(page.getByTestId("folder-item")).toHaveCount(1);
  await crumbs.getByRole("link", { name: "내 노트" }).click();
  await expect(page).toHaveURL(/localhost:3000\/$/);
  await expect(page.getByTestId("folder-item")).toHaveCount(1);
});

test("좌측 패널이 지금 열려 있는 폴더의 내용만 보여준다", async ({ page }) => {
  await signUpAndEnter(page);

  // 뿌리에 노트 하나
  await createDocNote(page);
  await writeNote(page, "뿌리에 있는 노트");

  await page.goto("/");
  await makeFolder(page, "자격증 공부");
  await openFolder(page, "자격증 공부");

  // 폴더 안에서 만든 노트는 폴더 안에만 보인다
  await createDocNote(page);
  await writeNote(page, "폴더 안에 있는 노트");
  await expect(page.getByTestId("note-item")).toHaveCount(1);
  await expect(page.getByTestId("note-item")).toContainText("폴더 안에 있는 노트");

  await page.getByRole("navigation", { name: "폴더 경로" }).getByRole("link", { name: "내 노트" }).click();
  await expect(page.getByTestId("note-item")).toHaveCount(1);
  await expect(page.getByTestId("note-item")).toContainText("뿌리에 있는 노트");
});

test("노트를 폴더에 넣고 다른 폴더로 옮긴다", async ({ page }) => {
  await signUpAndEnter(page);

  await makeFolder(page, "여행 계획");
  await makeFolder(page, "장보기 모음");

  await createDocNote(page);
  await writeNote(page, "제주 3박 4일");

  await page.getByRole("button", { name: "폴더로 옮기기" }).click();
  await page.getByRole("button", { name: "여행 계획", exact: true }).click();

  // 옮긴 폴더 안에서 보인다
  await expect(page.getByRole("navigation", { name: "폴더 경로" })).toContainText(
    "여행 계획",
  );
  await expect(page.getByTestId("note-item")).toContainText("제주 3박 4일");

  // 뿌리에서는 더 이상 보이지 않는다
  await page.goto("/");
  await expect(page.getByTestId("note-item")).toHaveCount(0);

  // 다른 폴더로 다시 옮긴다
  await openFolder(page, "여행 계획");
  await page.getByTestId("note-item").click();
  await page.waitForURL(/\/notes\//);
  await page.getByRole("button", { name: "폴더로 옮기기" }).click();
  await page.getByRole("button", { name: "장보기 모음", exact: true }).click();
  await expect(page.getByRole("navigation", { name: "폴더 경로" })).toContainText(
    "장보기 모음",
  );
  await expect(page.getByTestId("note-item")).toContainText("제주 3박 4일");
});

test("폴더를 지우면 그 안의 하위 폴더와 노트가 함께 휴지통으로 가고, 되돌리면 원래 구조로 돌아온다", async ({
  page,
}) => {
  await signUpAndEnter(page);

  await makeFolder(page, "2025 아카이브");
  await openFolder(page, "2025 아카이브");
  const archiveUrl = page.url();

  await makeFolder(page, "하위 폴더");
  await createDocNote(page);
  await writeNote(page, "아카이브 안의 노트");

  // 폴더를 지우면 상위로 올라가고 목록에서 사라진다
  await page.goto(archiveUrl);
  await page.getByRole("button", { name: "이 폴더를 휴지통으로" }).click();
  await confirmDialog(page, "휴지통으로 보내기");
  await expect(page).toHaveURL(/localhost:3000\/$/);
  await expect(page.getByTestId("folder-item")).toHaveCount(0);
  await expect(page.getByTestId("note-item")).toHaveCount(0);

  // 휴지통에는 지운 폴더 한 줄만 나오고, 함께 들어온 개수를 알린다
  await page.goto("/trash");
  await expect(page.getByTestId("trash-row")).toHaveCount(1);
  const row = page.getByTestId("trash-row");
  await expect(row).toContainText("2025 아카이브");
  await expect(row).toContainText("2개 함께 들어옴");

  // 되돌리면 원래 구조가 그대로 돌아온다
  await row.getByRole("button", { name: "되돌리기" }).click();
  await expect(page.getByTestId("trash-row")).toHaveCount(0);

  await page.goto(archiveUrl);
  await expect(page.getByTestId("folder-item")).toContainText("하위 폴더");
  await expect(page.getByTestId("note-item")).toContainText("아카이브 안의 노트");
});

test("노트를 지우면 휴지통으로 가고 보관함 목록에서 사라진다", async ({ page }) => {
  await signUpAndEnter(page);

  await createDocNote(page);
  await writeNote(page, "임시 — 나중에 정리");

  await page.getByRole("button", { name: "휴지통으로 보내기" }).click();
  await confirmDialog(page, "휴지통으로 보내기");

  await expect(page).toHaveURL(/localhost:3000\/$/);
  await expect(page.getByTestId("note-item")).toHaveCount(0);

  await page.goto("/trash");
  await expect(page.getByTestId("trash-row")).toContainText("임시 — 나중에 정리");

  // 되돌리면 보관함으로 돌아온다
  await page.getByRole("button", { name: "되돌리기" }).click();
  await expect(page.getByTestId("trash-row")).toHaveCount(0);
  await page.goto("/");
  await expect(page.getByTestId("note-item")).toContainText("임시 — 나중에 정리");
});

test("돌아갈 폴더가 아직 휴지통에 있으면 되돌린 폴더가 보관함 뿌리로 온다", async ({
  page,
}) => {
  await signUpAndEnter(page);

  await makeFolder(page, "상위 폴더");
  await openFolder(page, "상위 폴더");
  const parentUrl = page.url();
  await makeFolder(page, "하위 폴더");
  await openFolder(page, "하위 폴더");
  const childUrl = page.url();
  await createDocNote(page);
  await writeNote(page, "하위 폴더 안의 노트");

  // 하위 폴더를 먼저 지우고, 이어서 상위 폴더도 지운다.
  // 따로 지웠으므로 휴지통에 두 줄이 각각 선다.
  await page.goto(childUrl);
  await page.getByRole("button", { name: "이 폴더를 휴지통으로" }).click();
  await confirmDialog(page, "휴지통으로 보내기");
  await expect(page.getByTestId("folder-item")).toHaveCount(0);

  await page.goto(parentUrl);
  await page.getByRole("button", { name: "이 폴더를 휴지통으로" }).click();
  await confirmDialog(page, "휴지통으로 보내기");

  await page.goto("/trash");
  await expect(page.getByTestId("trash-row")).toHaveCount(2);

  // 하위 폴더만 되돌린다. 돌아갈 자리인 상위 폴더가 아직 휴지통에 있으므로
  // 원래 자리 대신 보관함 뿌리에 나타난다.
  await page
    .getByTestId("trash-row")
    .filter({ hasText: "하위 폴더" })
    .getByRole("button", { name: "되돌리기" })
    .click();
  await expect(page.getByTestId("trash-row")).toHaveCount(1);

  await page.goto("/");
  await expect(page.getByTestId("folder-item")).toContainText("하위 폴더");

  // 남은 상위 폴더를 영구 삭제해도 되돌려 둔 폴더와 그 안의 노트는 남는다
  await page.goto("/trash");
  await page.getByTestId("trash-row").getByRole("button", { name: "영구 삭제" }).click();
  await confirmDialog(page, "영구 삭제");
  await expect(page.getByTestId("trash-row")).toHaveCount(0);

  await page.goto("/");
  await expect(page.getByTestId("folder-item")).toHaveCount(1);
  await openFolder(page, "하위 폴더");
  await expect(page.getByTestId("note-item")).toContainText("하위 폴더 안의 노트");
});

test("영구 삭제는 확인을 받은 뒤에만 이루어지고 되돌릴 수 없다", async ({ page }) => {
  await signUpAndEnter(page);

  await createDocNote(page);
  await writeNote(page, "지울 낙서");
  await page.getByRole("button", { name: "휴지통으로 보내기" }).click();
  await confirmDialog(page, "휴지통으로 보내기");

  await page.goto("/trash");
  await expect(page.getByTestId("trash-row")).toHaveCount(1);

  // 확인 창에서 취소하면 그대로 남는다
  await page.getByTestId("trash-row").getByRole("button", { name: "영구 삭제" }).click();
  await expect(page.getByText("돌이킬 수 없습니다")).toBeVisible();
  await page.getByRole("alertdialog").getByRole("button", { name: "취소" }).click();
  await expect(page.getByTestId("trash-row")).toHaveCount(1);

  // 확인하면 사라지고 휴지통이 빈다
  await page.getByTestId("trash-row").getByRole("button", { name: "영구 삭제" }).click();
  await confirmDialog(page, "영구 삭제");
  await expect(page.getByTestId("trash-row")).toHaveCount(0);
  await expect(page.getByText("휴지통이 비었습니다")).toBeVisible();
});

test("휴지통이 비어 있으면 그 사실을 알린다", async ({ page }) => {
  await signUpAndEnter(page);
  await page.goto("/trash");
  await expect(page.getByText("휴지통이 비었습니다")).toBeVisible();
  await expect(page.getByRole("button", { name: "휴지통 비우기" })).toHaveCount(0);
});

test("정렬 기준과 뒤집기가 폴더 안에서도 동작한다", async ({ page }) => {
  await signUpAndEnter(page);

  await makeFolder(page, "정렬 시험");
  await openFolder(page, "정렬 시험");
  const folderUrl = page.url();

  for (const title of ["다 노트", "가 노트", "나 노트"]) {
    await page.goto(folderUrl);
    await createDocNote(page);
    await page.getByLabel("노트 제목").fill(title);
    await expect(
      page.getByTestId("note-item").filter({ hasText: title }).first(),
    ).toBeVisible(SAVED);
  }

  await page.goto(folderUrl);
  const items = page.getByTestId("note-item");
  await expect(items).toHaveCount(3);

  await page.getByLabel("정렬 기준").click();
  await page.getByRole("option", { name: "제목 가나다순" }).click();
  await expect(page).toHaveURL(/folder=/);
  await expect(items.first()).toContainText("가 노트");
  await expect(items.nth(2)).toContainText("다 노트");

  await page.getByRole("button", { name: "정렬 순서 뒤집기" }).click();
  await expect(items.first()).toContainText("다 노트");
  await expect(items.nth(2)).toContainText("가 노트");
});
