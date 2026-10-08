import { expect, test, type Page } from "@playwright/test";
import {
  createDocNote,
  signInAndEnter,
  signUpAndEnter,
} from "./support/account";

// 자동 저장은 입력이 멈추고 2초 뒤에 일어난다. 그보다 넉넉히 기다린다.
const SAVED = { timeout: 20_000 };

/**
 * 저장이 실제로 끝났는지는 좌측 목록으로 확인한다. 저장에 성공해야 목록이
 * 새 제목과 미리보기로 다시 그려지므로, 머리말의 표시보다 확실한 신호다.
 */
async function expectSaved(page: Page, text: string) {
  await expect(
    page.getByTestId("note-item").filter({ hasText: text }).first(),
  ).toBeVisible(SAVED);
}

async function writeBody(page: Page, text: string) {
  const body = page.getByTestId("note-body");
  await body.click();
  await page.keyboard.type(text);
  // 화면에 실제로 들어갔는지 확인하고 넘어간다. 아직 hydration 전이라 입력이
  // 자동 저장을 깨우지 못하는 순간을 테스트가 통과로 넘기지 않게 한다.
  await expect(body).toContainText(text);
}

async function appendToBody(page: Page, text: string) {
  const body = page.getByTestId("note-body");
  await body.click();
  await page.keyboard.press("End");
  await page.keyboard.type(text);
  await expect(body).toContainText(text);
}

async function createTitledNote(page: Page, title: string, body: string) {
  await page.goto("/");
  await createDocNote(page);
  await writeBody(page, body);
  await page.getByLabel("노트 제목").fill(title);
  await expectSaved(page, title);
}

test("새 노트를 만들어 쓰면 알아서 저장되고 다시 열어도 그대로다", async ({ page }) => {
  await signUpAndEnter(page);

  await expect(page.getByText("첫 노트를 만들어 보세요")).toBeVisible();
  await createDocNote(page);

  await writeBody(page, "결제 모듈 회귀 테스트를 머지 직후에 돌린다");
  await page.getByLabel("노트 제목").fill("주간 스프린트 회의");

  // 굵게와 글머리 목록을 적용한다
  await page.getByTestId("note-body").click();
  await page.keyboard.press("Control+a");
  await page.getByRole("button", { name: "굵게" }).click();
  await page.getByRole("button", { name: "글머리 목록" }).click();

  await expectSaved(page, "주간 스프린트 회의");

  const noteUrl = page.url();
  await page.reload();

  await expect(page.getByLabel("노트 제목")).toHaveValue("주간 스프린트 회의");
  await expect(page.getByTestId("note-body")).toContainText("결제 모듈 회귀 테스트");
  // 서식도 함께 남는다. 굵게는 인라인 style로 저장된다.
  await expect(page.getByTestId("note-body").locator("li")).toHaveCount(1);
  await expect(
    page.getByTestId("note-body").locator("li span").first(),
  ).toHaveCSS("font-weight", "700");

  // 목록에서 다시 연다
  await page.goto("/");
  await expect(page.getByTestId("note-item")).toHaveCount(1);
  await page.getByTestId("note-item").click();
  await expect(page).toHaveURL(noteUrl);
  await expect(page.getByTestId("note-body")).toContainText("결제 모듈 회귀 테스트");
});

test("제목을 비워 두면 본문 첫 줄이 목록의 제목 자리에 쓰인다", async ({ page }) => {
  await signUpAndEnter(page);
  await createDocNote(page);

  await writeBody(page, "대파 2단 달걀 한 판");
  await expectSaved(page, "대파 2단 달걀 한 판");

  await page.goto("/");
  await expect(page.getByTestId("note-item")).toContainText("대파 2단 달걀 한 판");
});

test("정렬 기준을 바꾸면 목록 순서가 실제로 바뀌고 뒤집을 수 있다", async ({ page }) => {
  await signUpAndEnter(page);

  await createTitledNote(page, "다 노트", "세 번째로 만든 노트");
  await createTitledNote(page, "가 노트", "두 번째로 만든 노트");
  await createTitledNote(page, "나 노트", "첫 번째로 만든 노트");

  await page.goto("/");
  const items = page.getByTestId("note-item");
  await expect(items).toHaveCount(3);

  // 기본은 수정일 최신순이므로 마지막에 저장한 노트가 맨 위다
  await expect(items.first()).toContainText("나 노트");

  await page.getByLabel("정렬 기준").click();
  await page.getByRole("option", { name: "제목 가나다순" }).click();
  await expect(items.first()).toContainText("가 노트");
  await expect(items.nth(1)).toContainText("나 노트");
  await expect(items.nth(2)).toContainText("다 노트");

  // 뒤집으면 역순이 되고, 한 번 더 누르면 되돌아온다
  await page.getByRole("button", { name: "정렬 순서 뒤집기" }).click();
  await expect(items.first()).toContainText("다 노트");
  await expect(items.nth(2)).toContainText("가 노트");

  await page.getByRole("button", { name: "정렬 순서 뒤집기" }).click();
  await expect(items.first()).toContainText("가 노트");
});

test("다른 기기가 먼저 바꿔 두었으면 조용히 덮지 않고 어느 쪽을 남길지 묻는다", async ({
  browser,
}) => {
  const first = await browser.newContext();
  const second = await browser.newContext();
  const deviceA = await first.newPage();
  const deviceB = await second.newPage();

  const username = await signUpAndEnter(deviceA);
  await createDocNote(deviceA);
  await writeBody(deviceA, "처음 쓴 내용");
  await expectSaved(deviceA, "처음 쓴 내용");
  const noteUrl = deviceA.url();

  // 두 번째 기기가 같은 노트를 같은 버전으로 연다
  await signInAndEnter(deviceB, username);
  await deviceB.goto(noteUrl);
  await expect(deviceB.getByTestId("note-body")).toContainText("처음 쓴 내용");

  // 첫 번째 기기가 먼저 바꾼다
  await appendToBody(deviceA, " — A가 덧붙임");
  await expectSaved(deviceA, "A가 덧붙임");

  // 두 번째 기기가 뒤늦게 저장하면 덮지 않고 알린다
  await appendToBody(deviceB, " — B가 덧붙임");
  await expect(
    deviceB.getByText("다른 기기에서 이 노트를 고쳤습니다. 어느 쪽을 남길까요?"),
  ).toBeVisible(SAVED);

  // 고르기 전에는 어느 쪽도 사라지지 않는다
  await expect(deviceB.getByTestId("note-body")).toContainText("B가 덧붙임");
  await deviceA.reload();
  await expect(deviceA.getByTestId("note-body")).toContainText("A가 덧붙임");
  await expect(deviceA.getByTestId("note-body")).not.toContainText("B가 덧붙임");

  // 최신 내용을 고르면 A가 쓴 내용이 들어온다
  await deviceB.getByRole("button", { name: "최신 내용 불러오기" }).click();
  await expect(deviceB.getByTestId("note-body")).toContainText("A가 덧붙임");

  await first.close();
  await second.close();
});

test("내 내용으로 덮기를 고르면 내가 쓴 내용이 남는다", async ({ browser }) => {
  const first = await browser.newContext();
  const second = await browser.newContext();
  const deviceA = await first.newPage();
  const deviceB = await second.newPage();

  const username = await signUpAndEnter(deviceA);
  await createDocNote(deviceA);
  await writeBody(deviceA, "처음 쓴 내용");
  await expectSaved(deviceA, "처음 쓴 내용");
  const noteUrl = deviceA.url();

  await signInAndEnter(deviceB, username);
  await deviceB.goto(noteUrl);
  await expect(deviceB.getByTestId("note-body")).toContainText("처음 쓴 내용");

  await appendToBody(deviceA, " — A가 덧붙임");
  await expectSaved(deviceA, "A가 덧붙임");

  await appendToBody(deviceB, " — B가 덧붙임");
  await expect(
    deviceB.getByText("다른 기기에서 이 노트를 고쳤습니다. 어느 쪽을 남길까요?"),
  ).toBeVisible(SAVED);

  await deviceB.getByRole("button", { name: "내 내용으로 덮기" }).click();
  await expectSaved(deviceB, "B가 덧붙임");

  await deviceA.reload();
  await expect(deviceA.getByTestId("note-body")).toContainText("B가 덧붙임");

  await first.close();
  await second.close();
});

/**
 * 본문의 [from, to) 글자를 고른다. 사람이 끌어 고르는 것과 같은 자리를
 * 만들고, 서식 메뉴가 듣고 있는 selectionchange를 깨운다.
 */
async function selectRange(page: Page, from: number, to: number) {
  await page.evaluate(
    ([start, end]) => {
      const editor = document.querySelector(
        '[data-testid="note-body"]',
      ) as HTMLElement;
      const walk = document.createTreeWalker(editor, NodeFilter.SHOW_TEXT);
      const texts: Text[] = [];
      for (let node = walk.nextNode(); node; node = walk.nextNode()) {
        texts.push(node as Text);
      }

      const range = document.createRange();
      let seen = 0;
      let started = false;
      for (const text of texts) {
        const length = text.data.length;
        if (!started && seen + length >= start) {
          range.setStart(text, start - seen);
          started = true;
        }
        if (started && seen + length >= end) {
          range.setEnd(text, end - seen);
          break;
        }
        seen += length;
      }

      const selection = window.getSelection()!;
      selection.removeAllRanges();
      selection.addRange(range);
      document.dispatchEvent(new Event("selectionchange"));
    },
    [from, to],
  );
}

test("글자 배경색은 고른 글에 적용되고 다시 열어도 남는다", async ({ page }) => {
  await signUpAndEnter(page);
  await createDocNote(page);
  await writeBody(page, "강조할 글과 보통 글");

  const body = page.getByTestId("note-body");
  await selectRange(page, 0, 5);
  await page.getByLabel("글자 색", { exact: true }).fill("#0055aa");
  await selectRange(page, 0, 5);
  await page.getByLabel("글자 배경색", { exact: true }).fill("#ffeb3b");

  async function expectHighlight() {
    const highlighted = body.locator('span[style*="background-color"]');
    await expect(highlighted).toHaveText("강조할 글");
    await expect(highlighted).toHaveCSS("background-color", "rgb(255, 235, 59)");
    await expect(highlighted).toHaveCSS("color", "rgb(0, 85, 170)");
    await expect(body).toContainText("강조할 글과 보통 글");
  }

  await expectHighlight();
  await expect(page.getByTestId("save-state")).toHaveAttribute("data-state", "saved", SAVED);
  await expect(page.getByTestId("save-state")).toHaveAttribute("data-saved-count", /[1-9]\d*/, SAVED);
  await page.reload();
  await expectHighlight();
});

async function pasteDoc(page: Page, html: string, text: string) {
  await page.getByTestId("note-body").evaluate((editor, content) => {
    const clipboard = new DataTransfer();
    clipboard.setData("text/html", content.html);
    clipboard.setData("text/plain", content.text);
    editor.dispatchEvent(new ClipboardEvent("paste", { clipboardData: clipboard, bubbles: true, cancelable: true }));
  }, { html, text });
}

test("붙여넣은 목록은 외부 문단 배경 없이 들어오고 글자 서식을 다시 바꿀 수 있다", async ({ page }) => {
  await signUpAndEnter(page);
  await createDocNote(page);
  const body = page.getByTestId("note-body");
  await body.click();
  await pasteDoc(page, '<ul style="background:#181818;padding:40px;color:#ccc"><li><strong>첫 항목</strong></li><li>다음 항목</li></ul>', "첫 항목\n다음 항목");
  await expect(body.locator("li")).toHaveCount(2);
  await expect(body.locator("strong")).toHaveText("첫 항목");
  await expect(body.locator("ul")).not.toHaveAttribute("style", /background|padding/);
  await selectRange(page, 0, 4);
  await page.getByLabel("글자 색", { exact: true }).fill("#0055aa");
  await expect(body.locator("li").first()).toContainText("첫 항목");
  await expect(body.locator("strong")).toHaveCSS("color", "rgb(0, 85, 170)");
});

test("서식 없이 붙여넣기는 글과 개행만 가져온다", async ({ page }) => {
  await signUpAndEnter(page);
  await createDocNote(page);
  const body = page.getByTestId("note-body");
  await body.click();
  await page.context().grantPermissions(["clipboard-read", "clipboard-write"]);
  await page.evaluate(async () => {
    await navigator.clipboard.write([new ClipboardItem({
      "text/html": new Blob(['<b style="color:red">첫 줄</b><p>다음 줄</p>'], { type: "text/html" }),
      "text/plain": new Blob(["첫 줄\n다음 줄"], { type: "text/plain" }),
    })]);
  });
  await body.press("Control+Shift+V");
  await expect(body).toContainText("첫 줄");
  await expect(body).toContainText("다음 줄");
  await expect(body.locator("b,strong,[style]")).toHaveCount(0);
  await expect(body.locator("br")).toHaveCount(1);
});

test("기존 목록의 서식을 지워도 다른 항목과 개행은 보존되고 되돌리기와 저장이 된다", async ({ page }) => {
  await signUpAndEnter(page);
  await createDocNote(page);
  const body = page.getByTestId("note-body");
  await body.click();
  // 붙여넣기 정책 이전에 저장한 외부 HTML을 재현한다.
  await page.evaluate(() => document.execCommand("insertHTML", false, '<ul style="background-color:rgb(24,24,24);color:white;font-size:20px"><li><strong>첫 항목</strong><br>이어짐</li><li><em>다음 항목</em></li></ul>'));
  await selectRange(page, 0, 4);
  await page.getByRole("button", { name: "서식 지우기", exact: true }).click();
  await expect(body.locator("li")).toHaveCount(2);
  await expect(body.locator("li").first().locator("strong,[style]")).toHaveCount(0);
  await expect(body.locator("li").first()).not.toHaveAttribute("style", /background|color|font/);
  await expect(body.locator("li").first().locator("br")).toHaveCount(1);
  await expect(body.locator("li").nth(1)).toHaveCSS("background-color", "rgb(24, 24, 24)");
  await expect(body.locator("li").nth(1).locator("em")).toHaveText("다음 항목");
  await body.press("Control+z");
  await expect(body.locator("ul")).toHaveCSS("background-color", "rgb(24, 24, 24)");
  await body.press("Control+Shift+z");
  await expect(body.locator("li").first().locator("strong,[style]")).toHaveCount(0);
  await body.press("Control+z");
  await selectRange(page, 0, 4);
  await page.getByRole("button", { name: "서식 지우기", exact: true }).click();
  await expect(page.getByTestId("save-state")).toHaveAttribute("data-state", "saved", SAVED);
  await expect(page.getByTestId("save-state")).toHaveAttribute("data-saved-count", /[1-9]\d*/, SAVED);
  await page.reload();
  await expect(body.locator("li")).toHaveCount(2);
  await expect(body.locator("li").first().locator("strong,[style]")).toHaveCount(0);
  await expect(body.locator("li").nth(1)).toHaveCSS("background-color", "rgb(24, 24, 24)");
});

test("서식 메뉴가 고른 글에 걸린 서식을 그대로 비춘다", async ({ page }) => {
  await signUpAndEnter(page);
  await createDocNote(page);
  await writeBody(page, "굵은 앞부분과 보통인 뒷부분이 한 줄에 있습니다.");

  const bold = page.getByRole("button", { name: "굵게" });
  const size = page.getByLabel("글자 크기");

  await selectRange(page, 0, 6);
  await bold.click();
  await expect(bold).toHaveAttribute("aria-pressed", "true");

  // 서식이 걸리지 않은 자리로 옮기면 눌림이 풀린다.
  await selectRange(page, 20, 26);
  await expect(bold).toHaveAttribute("aria-pressed", "false");

  // 굵은 자리로 돌아오면 다시 눌려 있다.
  await selectRange(page, 1, 5);
  await expect(bold).toHaveAttribute("aria-pressed", "true");

  // 크기 칸도 마찬가지다. 드롭다운을 거쳐도 고른 자리를 잃지 않아야
  // 고른 글에만 크기가 걸린다.
  await expect(size).toContainText("15");
  await selectRange(page, 0, 6);
  await size.click();
  await page.getByRole("option", { name: "24", exact: true }).click();
  await expect(size).toContainText("24");
  await expect(page.getByTestId("note-body")).toContainText("굵은 앞부분");

  await selectRange(page, 20, 26);
  await expect(size).toContainText("15");
});
