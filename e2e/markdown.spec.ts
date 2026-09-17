import { expect, test, type Page } from "@playwright/test";
import { signUpAndEnter } from "./support/account";

// 자동 저장은 입력이 멈추고 2초 뒤에 일어난다. 그보다 넉넉히 기다린다.
const SAVED = { timeout: 20_000 };

const SOURCE = [
  "# 서버 컴포넌트 정리",
  "",
  "## 왜 쓰는가",
  "",
  "- 번들에 안 들어간다",
  "- **데이터 접근**이 서버에서 끝난다",
  "",
  "```tsx",
  "export default async function Page() {}",
  "```",
  "",
  "> 서버 컴포넌트와 서버 액션은 다른 이야기다.",
  "",
  "| 구분 | 실행 시점 |",
  "| --- | --- |",
  "| 서버 | 렌더 |",
  "",
  "[Next.js 문서](https://nextjs.org)",
].join("\n");

/** 뷰어 토글은 누르는 순간 저장이 시작된다. 그 저장이 끝나기를 기다린다. */
async function clickViewerAndWaitForSave(page: Page) {
  const saveState = page.getByTestId("save-state");
  const before = await saveState.getAttribute("data-saved-count");
  await page.getByRole("button", { name: "뷰어" }).click();
  // 저장 횟수가 오를 때까지 기다린다. 이미 "저장됨"이던 상태를 완료로 읽지 않는다.
  await expect(saveState).not.toHaveAttribute(
    "data-saved-count",
    before ?? "0",
    SAVED,
  );
}

async function expectSaved(page: Page, text: string) {
  await expect(
    page.getByTestId("note-item").filter({ hasText: text }).first(),
  ).toBeVisible(SAVED);
}

async function createMarkdownNote(page: Page) {
  await page.getByRole("button", { name: "새 노트 만들기" }).first().click();
  await page.getByRole("button", { name: "Markdown" }).click();
  await page.waitForURL(/\/notes\//);
}

test("Markdown 노트를 만들어 쓰면 뷰어가 결과를 보여주고 그대로 저장된다", async ({
  page,
}) => {
  await signUpAndEnter(page);
  await createMarkdownNote(page);

  const viewer = page.getByTestId("md-viewer");
  // 되돌릴 수 있는 가정: 뷰어는 처음 열 때 켜져 있다
  await expect(viewer).toBeVisible();

  await page.getByTestId("note-body").fill(SOURCE);

  // 제목, 목록, 강조, 코드, 인용, 표, 링크가 각각 결과로 나온다
  await expect(viewer.getByRole("heading", { name: "서버 컴포넌트 정리" })).toBeVisible();
  await expect(viewer.getByRole("heading", { name: "왜 쓰는가" })).toBeVisible();
  await expect(viewer.locator("li")).toHaveCount(2);
  await expect(viewer.locator("strong")).toHaveText("데이터 접근");
  await expect(viewer.locator("pre code")).toContainText("export default async");
  await expect(viewer.locator("blockquote")).toContainText("다른 이야기다");
  await expect(viewer.locator("table th").first()).toHaveText("구분");
  await expect(viewer.getByRole("link", { name: "Next.js 문서" })).toHaveAttribute(
    "href",
    "https://nextjs.org",
  );

  // 목록에 형식과 원문 미리보기가 함께 보인다
  await expectSaved(page, "서버 컴포넌트 정리");
  const item = page.getByTestId("note-item").first();
  await expect(item).toContainText("Markdown");
  await expect(item).toContainText("번들에 안 들어간다");

  // 새로고침해도 원문이 그대로다
  await page.reload();
  await expect(page.getByTestId("note-body")).toHaveValue(SOURCE);
});

test("뷰어를 끄면 편집 영역이 전체 폭을 쓰고, 끈 상태가 노트에 기억된다", async ({
  page,
}) => {
  await signUpAndEnter(page);
  await createMarkdownNote(page);

  await page.getByTestId("note-body").fill("# 뷰어 상태 점검");
  await expectSaved(page, "뷰어 상태 점검");

  const split = page.getByTestId("md-split");
  const columnsWithViewer = await split.evaluate(
    (node) => getComputedStyle(node).gridTemplateColumns,
  );

  await clickViewerAndWaitForSave(page);
  await expect(page.getByTestId("md-viewer")).toHaveCount(0);

  const columnsWithoutViewer = await split.evaluate(
    (node) => getComputedStyle(node).gridTemplateColumns,
  );
  expect(columnsWithoutViewer).not.toBe(columnsWithViewer);

  // 목록으로 나갔다 다시 열어도 꺼진 상태다
  await page.goto("/");
  await page.getByTestId("note-item").first().click();
  await page.waitForURL(/\/notes\//);
  await expect(page.getByTestId("md-viewer")).toHaveCount(0);
  await expect(page.getByRole("button", { name: "뷰어" })).toHaveAttribute(
    "aria-pressed",
    "false",
  );

  // 다시 켜면 그 상태도 기억된다
  await clickViewerAndWaitForSave(page);
  await expect(page.getByTestId("md-viewer")).toBeVisible();
  await page.reload();
  await expect(page.getByTestId("md-viewer")).toBeVisible();
});

test("Markdown 노트도 다른 기기의 변경을 조용히 덮지 않는다", async ({ browser }) => {
  const first = await browser.newContext();
  const second = await browser.newContext();
  const deviceA = await first.newPage();
  const deviceB = await second.newPage();

  const username = await signUpAndEnter(deviceA);
  await createMarkdownNote(deviceA);
  await deviceA.getByTestId("note-body").fill("# 처음 쓴 원문");
  await expectSaved(deviceA, "처음 쓴 원문");
  const noteUrl = deviceA.url();

  await deviceB.goto("/login");
  await deviceB.getByLabel("아이디").fill(username);
  await deviceB.getByLabel("비밀번호").fill("Gureum2026!");
  await deviceB.getByRole("button", { name: "로그인" }).click();
  await deviceB.waitForURL("/");
  await deviceB.goto(noteUrl);
  await expect(deviceB.getByTestId("note-body")).toHaveValue("# 처음 쓴 원문");

  await deviceA.getByTestId("note-body").fill("# 처음 쓴 원문\n\nA가 덧붙임");
  await expectSaved(deviceA, "A가 덧붙임");

  await deviceB.getByTestId("note-body").fill("# 처음 쓴 원문\n\nB가 덧붙임");
  await expect(
    deviceB.getByText("다른 기기에서 이 노트를 고쳤습니다. 어느 쪽을 남길까요?"),
  ).toBeVisible(SAVED);

  // 고르기 전에는 어느 쪽도 사라지지 않는다
  await expect(deviceB.getByTestId("note-body")).toHaveValue(
    "# 처음 쓴 원문\n\nB가 덧붙임",
  );
  await deviceA.reload();
  await expect(deviceA.getByTestId("note-body")).toHaveValue(
    "# 처음 쓴 원문\n\nA가 덧붙임",
  );

  await deviceB.getByRole("button", { name: "최신 내용 불러오기" }).click();
  await expect(deviceB.getByTestId("note-body")).toHaveValue(
    "# 처음 쓴 원문\n\nA가 덧붙임",
  );

  await first.close();
  await second.close();
});
