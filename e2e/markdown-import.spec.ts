import { expect, test } from "@playwright/test";
import { signUpAndEnter } from "./support/account";

const source = "# 가져온 공부 자료\n\n- **한글 목록**\n- [링크](https://example.com)\n\n```ts\nconst value = 1;\n```\n";
const file = { name: "공부 자료.MD", mimeType: "text/markdown", buffer: Buffer.from(`\ufeff${source}`) };

test("R08: Markdown 파일을 가져와 다시 열고 수정·내보내기·검색·공유한다", async ({ page, context }) => {
  await signUpAndEnter(page);
  await page.goto("/settings");
  await expect(page.getByLabel("Markdown 파일", { exact: true })).toBeEnabled();
  await page.getByLabel("Markdown 파일", { exact: true }).setInputFiles(file);
  await page.getByRole("button", { name: "노트로 가져오기", exact: true }).click();
  await expect(page).toHaveURL(/\/notes\//);
  const firstUrl = page.url();
  await expect(page.getByLabel("노트 제목")).toHaveValue("공부 자료");
  await expect(page.getByTestId("note-body")).toHaveValue(source);
  await expect(page.getByTestId("md-viewer").getByRole("heading", { name: "가져온 공부 자료" })).toBeVisible();
  await page.reload();
  await expect(page.getByTestId("note-body")).toHaveValue(source);
  await page.waitForFunction(() => {
    const editor = document.querySelector('[data-testid="note-body"]');
    return editor && Object.keys(editor).some((key) => key.startsWith("__reactProps$"));
  });

  const edited = `${source}\n추가한 기록`;
  await page.getByTestId("note-body").fill(edited);
  await expect(page.getByTestId("note-body")).toHaveValue(edited);
  await expect(page.getByTestId("save-state")).toHaveAttribute("data-saved-count", "1", { timeout: 20_000 });
  const downloadPromise = page.waitForEvent("download");
  await page.getByRole("button", { name: "파일로 내보내기", exact: true }).click();
  const download = await downloadPromise;
  const stream = await download.createReadStream();
  const chunks = [];
  for await (const chunk of stream!) chunks.push(chunk);
  expect(Buffer.concat(chunks).toString("utf8")).toBe(edited);

  await page.getByRole("searchbox", { name: "노트 검색" }).fill("추가한 기록");
  await page.getByRole("button", { name: "검색", exact: true }).click();
  await expect(page.getByRole("link").filter({ hasText: "공부 자료" }).first()).toBeVisible();

  await page.goto(firstUrl);
  await page.getByRole("button", { name: "공유", exact: true }).click();
  await page.getByRole("button", { name: "링크 만들기", exact: true }).click();
  const shareUrl = await page.getByLabel("공유 링크", { exact: true }).inputValue();
  const shared = await context.newPage();
  await shared.goto(shareUrl);
  await expect(shared.getByRole("heading", { name: "가져온 공부 자료" })).toBeVisible();
  await shared.close();

  await page.goto("/settings");
  await expect(page.getByLabel("Markdown 파일", { exact: true })).toBeEnabled();
  await page.getByLabel("Markdown 파일", { exact: true }).setInputFiles(file);
  await page.getByRole("button", { name: "노트로 가져오기", exact: true }).click();
  await expect(page).toHaveURL(/\/notes\//);
  expect(page.url()).not.toBe(firstUrl);
  await expect(page.getByTestId("note-body")).toHaveValue(source);
  await page.goto(firstUrl);
  await expect(page.getByTestId("note-body")).toHaveValue(edited);
});

test("R08: 좁은 화면에서 잘못된 파일을 안내하고 빈 Markdown을 가져온다", async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await signUpAndEnter(page);
  await page.goto("/settings");
  const input = page.getByLabel("Markdown 파일", { exact: true });
  await expect(input).toBeEnabled();
  const submit = page.getByRole("button", { name: "노트로 가져오기", exact: true });
  await input.setInputFiles({ name: "file.html", mimeType: "text/html", buffer: Buffer.from("<h1>HTML</h1>") });
  await expect(page.getByText("확장자가 .md인 파일을 선택해 주세요.")).toBeVisible();
  await expect(submit).toBeDisabled();
  await input.setInputFiles({ name: "large.md", mimeType: "text/plain", buffer: Buffer.alloc(512 * 1024 + 1, 65) });
  await expect(page.getByText("512 KiB 이하의 파일을 선택해 주세요.")).toBeVisible();
  await expect(submit).toBeDisabled();
  await input.setInputFiles({ name: "invalid.md", mimeType: "text/plain", buffer: Buffer.from([0xc0, 0xaf]) });
  await submit.click();
  await expect(page.getByText("UTF-8 텍스트로 저장한 Markdown 파일을 선택해 주세요.")).toBeVisible();
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
  await input.setInputFiles({ name: "빈 노트.md", mimeType: "", buffer: Buffer.alloc(0) });
  await submit.click();
  await expect(page).toHaveURL(/\/notes\//);
  await expect(page.getByLabel("노트 제목")).toHaveValue("빈 노트");
  await expect(page.getByTestId("note-body")).toHaveValue("");
});
