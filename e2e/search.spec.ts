import { expect, test, type Page } from "@playwright/test";
import { createDocNote, signUpAndEnter } from "./support/account";

const SAVED = { timeout: 20_000 };

async function save(page: Page, previous = "0") {
  await expect(page.getByTestId("save-state")).not.toHaveAttribute(
    "data-saved-count",
    previous,
    SAVED,
  );
  await expect(page.getByTestId("save-state")).toHaveAttribute(
    "data-state",
    "saved",
    SAVED,
  );
}

async function search(page: Page, query: string) {
  const form = page.getByRole("search", { name: "노트 검색" });
  await form.getByRole("searchbox").fill(query);
  await form.getByRole("button", { name: "검색", exact: true }).click();
  await expect(page).toHaveURL(/\/search\?q=/);
  await expect(
    form.getByRole("button", { name: "검색", exact: true }),
  ).toBeEnabled();
}

async function html(page: Page, content: string) {
  const body = page.getByTestId("note-body");
  await expect(body).toBeVisible();
  await body.evaluate((editor, value) => {
    editor.innerHTML = value;
    editor.dispatchEvent(new Event("input", { bubbles: true }));
  }, content);
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

test("R04: 폴더를 가로질러 세 형식의 본문 끝과 그림판의 모든 글상자를 찾는다", async ({
  page,
}) => {
  test.setTimeout(180_000);
  await signUpAndEnter(page);
  await createDocNote(page);
  await page.getByLabel("노트 제목").fill("공통검색 회의록");
  await html(
    page,
    `<p>${"앞부분 ".repeat(100)}</p><p><b>공통</b>검색 마지막 문구</p>`,
  );
  await save(page);
  await page.goto("/");
  await folder(page, "자료");
  await folder(page, "2026");
  await page.getByRole("button", { name: "새 노트 만들기" }).first().click();
  await page.getByRole("button", { name: "Markdown" }).click();
  await expect(page.getByTestId("note-body")).toBeVisible();
  await page.getByLabel("노트 제목").fill("학습 기록");
  await page
    .getByTestId("note-body")
    .fill(
      `# 정리\n\n${"다른 내용 ".repeat(80)}\n\n**공통**검색 코드\n\n\`\`\`js\nconst 코드검색 = 1;\n\`\`\``,
    );
  await save(page);
  await page.goto("/");
  await folder(page, "그림 모음");
  await page.getByRole("button", { name: "새 노트 만들기" }).first().click();
  await page.getByRole("button", { name: "그림판" }).click();
  const paper = page.getByTestId("note-body");
  await expect(paper).toBeVisible();
  await expect
    .poll(async () => (await paper.boundingBox())?.width ?? 0)
    .toBeGreaterThan(500);
  await page.getByLabel("노트 제목").fill("아이디어 그림");
  await page.getByRole("button", { name: "글상자", exact: true }).click();
  for (const [index, text] of [
    "첫 글상자는 다른 글",
    "공통검색 두 번째 글상자",
  ].entries()) {
    await paper.click({ position: { x: 100, y: 80 + index * 100 } });
    await page.getByLabel("글상자 내용").fill(text);
    await page.getByLabel("글상자 내용").press("Enter");
  }
  await save(page);
  await search(page, "공통검색");
  const results = page.getByTestId("search-result");
  await expect(results).toHaveCount(3);
  await expect(results.first()).toContainText("아이디어 그림");
  await expect(results.filter({ hasText: "학습 기록" })).toContainText(
    "내 노트 / 자료 / 2026",
  );
  await expect(results.filter({ hasText: "공통검색 회의록" })).toContainText(
    "마지막 문구",
  );
  await expect(results.filter({ hasText: "아이디어 그림" })).toContainText(
    "두 번째 글상자",
  );
  await expect(results.locator("mark")).toHaveCount(4); // 제목과 본문에 있어도 한 노트다.
  await results.filter({ hasText: "학습 기록" }).click();
  await expect(page.getByTestId("note-body")).toHaveValue(/코드검색/);
  await expect(page.getByRole("searchbox")).toHaveValue("공통검색");
  await expect(results).toHaveCount(3);
  await page.goBack();
  await expect(page.getByRole("searchbox")).toHaveValue("공통검색");
  await search(page, "코드검색");
  await expect(results).toHaveCount(1);
  await expect(results).toContainText("const 코드검색 = 1;");
});

test("R04: 문자 그대로 찾고 저장한 새 본문을 같은 검색어로 다시 조회한다", async ({
  page,
}) => {
  await signUpAndEnter(page);
  await createDocNote(page);
  await page.getByLabel("노트 제목").fill("업무 노트");
  await html(page, "<p>NeEdLe_%[]' &amp; 메모</p>");
  await save(page);
  await search(page, "needle_%[]' &");
  await expect(page.getByTestId("search-result")).toHaveCount(1);
  await expect(page.getByTestId("search-result").locator("mark")).toHaveText(
    "NeEdLe_%[]' &",
  );
  await page.getByTestId("search-result").click();
  await expect(page.getByTestId("note-body")).toBeVisible();
  const before = await page
    .getByTestId("save-state")
    .getAttribute("data-saved-count");
  await html(page, "<p>새로운 문구만 남음</p>");
  await save(page, before ?? "0");
  await search(page, "needle_%[]' &");
  await expect(page.getByTestId("search-empty")).toContainText(
    "일치하는 노트가 없어요",
  );
  await search(page, "새로운 문구");
  await expect(page.getByTestId("search-result")).toHaveCount(1);
  await search(page, "문구가없음");
  await expect(page.getByTestId("search-empty")).toBeVisible();
  await page.reload();
  await expect(page.getByRole("searchbox")).toHaveValue("문구가없음");
});

test("R04: 휴지통과 다른 계정의 노트는 제외하고 복원하면 다시 찾는다", async ({
  page,
  browser,
}) => {
  await signUpAndEnter(page);
  await createDocNote(page);
  await html(page, "<p>계정별검증 전용 문구</p>");
  await save(page);
  const noteUrl = page.url();
  const other = await browser.newContext({ locale: "ko-KR" });
  try {
    const otherPage = await other.newPage();
    await signUpAndEnter(otherPage);
    await search(otherPage, "계정별검증");
    await expect(otherPage.getByTestId("search-empty")).toBeVisible();
    await otherPage.goto(noteUrl);
    await expect(otherPage.getByRole("heading", { name: "404" })).toBeVisible();
  } finally {
    await other.close();
  }
  await page
    .getByRole("button", { name: "휴지통으로 보내기", exact: true })
    .click();
  await page
    .getByRole("alertdialog")
    .getByRole("button", { name: "휴지통으로 보내기", exact: true })
    .click();
  await expect(page).toHaveURL(/localhost:3000\/$/);
  await search(page, "계정별검증");
  await expect(page.getByTestId("search-empty")).toBeVisible();
  await page.goto("/trash");
  await page
    .getByTestId("trash-row")
    .getByRole("button", { name: "되돌리기", exact: true })
    .click();
  await expect(page.getByTestId("trash-row")).toHaveCount(0);
  await page.goto("/");
  await search(page, "계정별검증");
  await expect(page.getByTestId("search-result")).toHaveCount(1);
});

test("R04: 좁은 화면에서 한글 조합을 마친 뒤 검색하고 결과로 돌아온다", async ({
  page,
}) => {
  await signUpAndEnter(page);
  await createDocNote(page);
  await html(page, "<p>한글 검색 확인</p>");
  await save(page);
  await page.goto("/");
  await page.setViewportSize({ width: 390, height: 844 });
  const box = page.getByRole("searchbox");
  await box.fill("한글   검색");
  const prevented = await box.evaluate((input) => {
    const event = new KeyboardEvent("keydown", {
      key: "Enter",
      isComposing: true,
      bubbles: true,
      cancelable: true,
    });
    input.dispatchEvent(event);
    return event.defaultPrevented;
  });
  expect(prevented).toBe(true);
  await expect(page).toHaveURL(/localhost:3000\/$/);
  await box.press("Enter");
  await expect(page.getByTestId("search-result")).toHaveCount(1);
  await expect(box).toHaveValue("한글 검색");
  await page.getByTestId("search-result").click();
  await expect(page.getByTestId("note-body")).toBeVisible();
  await page.getByRole("button", { name: "목록으로", exact: true }).click();
  await expect(box).toHaveValue("한글 검색");
  await expect(page.getByTestId("search-result")).toBeVisible();
  const width = await page.evaluate(() => ({
    viewport: innerWidth,
    scroll: document.documentElement.scrollWidth,
  }));
  expect(width.scroll).toBeLessThanOrEqual(width.viewport);
  const asideWidth = await page
    .locator("aside")
    .evaluate((aside) => ({
      scroll: aside.scrollWidth,
      client: aside.clientWidth,
    }));
  expect(asideWidth.scroll).toBeLessThanOrEqual(asideWidth.client);
});
