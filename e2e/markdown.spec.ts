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

test("R14: 체크리스트 이어쓰기·종료를 실행 취소하고 저장한 원문과 뷰어를 다시 연다", async ({ page }) => {
  await signUpAndEnter(page);
  await createMarkdownNote(page);
  const body = page.getByTestId("note-body");
  await body.fill("- [x] 완료");
  await body.press("Enter");
  await expect(body).toHaveValue("- [x] 완료\n- [ ] ");
  await body.press("ControlOrMeta+z");
  await expect(body).toHaveValue("- [x] 완료");
  await body.press("Enter");
  await page.keyboard.insertText("예정");
  await body.press("Enter");
  await body.press("Enter");
  await expect(body).toHaveValue("- [x] 완료\n- [ ] 예정\n");
  await body.press("ControlOrMeta+z");
  await expect(body).toHaveValue("- [x] 완료\n- [ ] 예정\n- [ ] ");
  await body.press("ControlOrMeta+Shift+z");
  const expected = "- [x] 완료\n- [ ] 예정\n";
  await expect(body).toHaveValue(expected);
  await expect(page.getByTestId("save-state")).toHaveAttribute("data-state", "saved", SAVED);
  await page.reload();
  await expect(body).toHaveValue(expected);
  const checks = page.getByTestId("md-viewer").getByRole("checkbox");
  await expect(checks).toHaveCount(2);
  await expect(checks.first()).toBeChecked();
  await expect(checks.last()).not.toBeChecked();
});

test("R14: 선택한 문구에 웹 링크를 넣고 실행 취소·저장·다시 열기를 지원한다", async ({ page }) => {
  await signUpAndEnter(page);
  await createMarkdownNote(page);
  const body = page.getByTestId("note-body");
  await body.fill("앞 문서 뒤");
  await body.evaluate((el: HTMLTextAreaElement) => el.setSelectionRange(2, 4));
  await body.press("ControlOrMeta+k");
  await expect(page.getByLabel("링크 문구")).toHaveValue("문서");
  const apply = page.getByRole("button", { name: "적용", exact: true });
  await page.getByLabel("URL", { exact: true }).fill("잘못된 주소");
  await expect(apply).toBeDisabled();
  await page.keyboard.press("Escape");
  await expect(body).toHaveValue("앞 문서 뒤");
  await page.getByRole("button", { name: "링크", exact: true }).click();
  await page.getByLabel("URL", { exact: true }).fill("https://example.com/docs");
  await apply.click();
  const expected = "앞 [문서](https://example.com/docs) 뒤";
  await expect(body).toHaveValue(expected);
  await expect(page.getByTestId("md-viewer").getByRole("link", { name: "문서" })).toHaveAttribute("href", "https://example.com/docs");
  await body.press("ControlOrMeta+z");
  await expect(body).toHaveValue("앞 문서 뒤");
  await body.press("ControlOrMeta+Shift+z");
  await expect(body).toHaveValue(expected);
  await expect(page.getByTestId("save-state")).toHaveAttribute("data-state", "saved", SAVED);
  await page.reload();
  await expect(body).toHaveValue(expected);
});

test("R14: 번호 항목을 나누고 Shift+Enter나 코드 예제에서는 일반 줄바꿈을 쓴다", async ({ page }) => {
  await signUpAndEnter(page);
  await createMarkdownNote(page);
  const body = page.getByTestId("note-body");
  await body.fill("9. 앞뒤");
  await body.press("ArrowLeft");
  await body.press("Enter");
  await expect(body).toHaveValue("9. 앞\n10. 뒤");
  await body.press("End");
  await body.press("Shift+Enter");
  await expect(body).toHaveValue("9. 앞\n10. 뒤\n");
  await body.fill("```md\n- 예시");
  await body.press("Enter");
  await expect(body).toHaveValue("```md\n- 예시\n");
  await body.fill("1. 모바일");
  await body.dispatchEvent("keydown", { key: "Enter", isComposing: true, bubbles: true, cancelable: true });
  await body.dispatchEvent("keyup", { key: "Enter", bubbles: true });
  await expect(body).toHaveValue("1. 모바일");
  await body.evaluate((input) => input.dispatchEvent(new InputEvent("beforeinput", {
    inputType: "insertLineBreak", cancelable: true, bubbles: true,
  })));
  await expect(body).toHaveValue("1. 모바일\n2. ");
});

test("R14: 좁은 화면에서 이미지 주소와 대체 텍스트를 넣고 다시 열어 그림을 본다", async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.route("https://images.example.test/**", route => route.fulfill({
    contentType: "image/svg+xml",
    body: '<svg xmlns="http://www.w3.org/2000/svg" width="48" height="24"><rect width="48" height="24"/></svg>',
  }));
  await signUpAndEnter(page);
  await createMarkdownNote(page);
  const body = page.getByTestId("note-body");
  await body.fill("지도 아래");
  await body.evaluate((input: HTMLTextAreaElement) => input.setSelectionRange(0, 2));
  await page.getByRole("button", { name: "이미지 삽입" }).click();
  await expect(page.getByLabel("대체 텍스트")).toHaveValue("지도");
  const address = "https://images.example.test/map(1).svg";
  await page.getByLabel("URL", { exact: true }).fill(address);
  await page.getByLabel("대체 텍스트").fill("지도 [입구]");
  await page.getByRole("button", { name: "적용", exact: true }).click();
  const expected = "![지도 \\[입구\\]](https://images.example.test/map\\(1\\).svg) 아래";
  await expect(body).toHaveValue(expected);
  const image = page.getByTestId("md-viewer").getByRole("img", { name: "지도 [입구]" });
  await expect(image).toHaveAttribute("src", address);
  await expect.poll(() => image.evaluate((img: HTMLImageElement) => img.naturalWidth)).toBe(48);
  await expect(page.getByTestId("save-state")).toHaveAttribute("data-state", "saved", SAVED);
  await page.reload();
  await expect(body).toHaveValue(expected);
  await expect(image).toBeVisible();
});

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

test("Markdown 경계선을 마우스·키보드·터치로 조절하고 뷰어 전환 시 비율을 유지한다", async ({ page }) => {
  await signUpAndEnter(page);
  await createMarkdownNote(page);
  const handle = page.getByRole("separator", { name: "원문과 뷰어 크기 조절" });
  const body = page.getByTestId("note-body");
  await expect(handle).toHaveAttribute("aria-orientation", "vertical");
  const original = (await body.boundingBox())!.width;
  const box = (await handle.boundingBox())!;
  await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2);
  await page.mouse.down();
  await page.mouse.move(box.x + 120, box.y + box.height / 2, { steps: 8 });
  await page.mouse.up();
  await expect.poll(async () => (await body.boundingBox())!.width).toBeGreaterThan(original + 80);
  const resized = (await body.boundingBox())!.width;
  await handle.focus();
  await page.keyboard.press("ArrowLeft");
  await expect.poll(async () => (await body.boundingBox())!.width).toBeLessThan(resized);
  const remembered = (await body.boundingBox())!.width;
  await expect(page.getByTestId("save-state")).toHaveAttribute("data-saved-count", "0");
  await clickViewerAndWaitForSave(page);
  await clickViewerAndWaitForSave(page);
  await expect.poll(async () => Math.abs((await body.boundingBox())!.width - remembered)).toBeLessThan(2);

  await page.setViewportSize({ width: 390, height: 844 });
  await expect(handle).toHaveAttribute("aria-orientation", "horizontal");
  const beforeTouch = (await body.boundingBox())!.height;
  const mobile = (await handle.boundingBox())!;
  const x = mobile.x + mobile.width / 2;
  const y = mobile.y + mobile.height / 2;
  const cdp = await page.context().newCDPSession(page);
  await cdp.send("Input.dispatchTouchEvent", { type: "touchStart", touchPoints: [{ x, y }] });
  for (let step = 1; step <= 6; step++) {
    await cdp.send("Input.dispatchTouchEvent", { type: "touchMove", touchPoints: [{ x, y: y + step * 10 }] });
  }
  await cdp.send("Input.dispatchTouchEvent", { type: "touchEnd", touchPoints: [] });
  await cdp.detach();
  await expect.poll(async () => (await body.boundingBox())!.height).toBeGreaterThan(beforeTouch + 40);
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
  await page.setViewportSize({ width: 1280, height: 720 });
  await expect(handle).toHaveAttribute("aria-orientation", "vertical");
  await handle.focus();
  await page.keyboard.press("Home");
  const groupWidth = (await page.getByTestId("md-split").boundingBox())!.width;
  await expect.poll(async () => (await body.boundingBox())!.width).toBeGreaterThan(groupWidth * 0.18);
});

test("뷰어를 끄면 편집 영역이 전체 폭을 쓰고, 끈 상태가 노트에 기억된다", async ({
  page,
}) => {
  await signUpAndEnter(page);
  await createMarkdownNote(page);

  await page.getByTestId("note-body").fill("# 뷰어 상태 점검");
  await expectSaved(page, "뷰어 상태 점검");

  const split = page.getByTestId("md-split");
  const widthWithViewer = (await page.getByTestId("note-body").boundingBox())!.width;

  await clickViewerAndWaitForSave(page);
  await expect(page.getByTestId("md-viewer")).toHaveCount(0);

  const widthWithoutViewer = (await page.getByTestId("note-body").boundingBox())!.width;
  expect(widthWithoutViewer).toBeGreaterThan(widthWithViewer);
  expect(widthWithoutViewer).toBeCloseTo((await split.boundingBox())!.width, 0);

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
