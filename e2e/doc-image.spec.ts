import { readFileSync } from "node:fs";
import { expect, test } from "@playwright/test";
import { createDocNote, signUpAndEnter } from "./support/account";
import { backupHtml } from "../lib/notes/backup-html";

test.describe("모바일", () => {
  test.use({ viewport: { width: 390, height: 844 }, hasTouch: true, isMobile: true });
  test("더보기에서 이미지 파일을 고르고 지원하지 않는 파일은 본문을 유지한다", async ({ page }) => {
    await signUpAndEnter(page);
    await createDocNote(page);
    const body = page.getByTestId("note-body");
    await body.fill("현장 사진");
    await body.press("End");
    await page.getByRole("button", {name:"더보기", exact:true}).tap();
    const choose = async (name: string, mimeType: string, buffer: Buffer) => {
      const selecting = page.waitForEvent("filechooser");
      await page.getByRole("button", {name:"이미지 삽입", exact:true}).tap();
      await (await selecting).setFiles({name, mimeType, buffer});
    };
    await choose("자료.txt", "text/plain", Buffer.from("자료"));
    await expect(page.getByRole("alert").filter({ hasText:"WebP" })).toBeVisible();
    await expect(body).toHaveText("현장 사진");
    const png = await page.evaluate(() => document.createElement("canvas").toDataURL().split(",")[1]);
    await choose("사진.png", "image/png", Buffer.from(png,"base64"));
    await expect(body.getByAltText("사진.png")).toBeVisible();
    await expect(page.getByRole("alert").filter({ hasText:"WebP" })).toHaveCount(0);
  });
});

test("스크린샷과 파일 이미지를 본문에 넣고 저장·공유·HTML 내보내기에서 다시 읽는다", async ({ page, browser }) => {
  await signUpAndEnter(page);
  await createDocNote(page);
  const body = page.getByTestId("note-body");
  await body.fill("앞뒤");
  await body.press("Home");
  await body.press("ArrowRight");
  const png = await body.evaluate(async (editor) => {
    const canvas = document.createElement("canvas");
    canvas.width = 2200;
    canvas.height = 1100;
    const ctx = canvas.getContext("2d")!;
    ctx.fillStyle = "#eb719d";
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    const blob = await new Promise<Blob>(resolve => canvas.toBlob(value => resolve(value!), "image/png"));
    const data = new DataTransfer();
    data.items.add(new File([blob], "붙여넣기.png", { type: blob.type }));
    editor.dispatchEvent(new ClipboardEvent("paste", { clipboardData: data, bubbles: true, cancelable: true }));
    return canvas.toDataURL().split(",")[1];
  });
  const pasted = body.getByAltText("붙여넣기.png");
  await expect(pasted).toBeVisible();
  expect(await pasted.evaluate(node => [node.previousSibling?.textContent, node.nextSibling?.textContent])).toEqual(["앞", "뒤"]);
  await expect.poll(() => pasted.evaluate(node => (node as HTMLImageElement).naturalWidth)).toBe(1920);
  await body.press("Control+z");
  await expect(pasted).toHaveCount(0);
  await body.press("Control+Shift+z");
  await expect(pasted).toBeVisible();
  const choosing = page.waitForEvent("filechooser");
  await page.getByRole("button", { name: "이미지 삽입", exact: true }).click();
  await (await choosing).setFiles({ name:"파일.png", mimeType:"image/png", buffer:Buffer.from(png, "base64") });
  await expect(body.getByAltText("파일.png")).toBeVisible();
  await expect(page.getByTestId("save-state")).toHaveAttribute("data-state","saved",{timeout:20000});
  await page.reload();
  await expect(body.locator("img")).toHaveCount(2);
  const html = await body.innerHTML();
  const restored = backupHtml(html);
  for (const src of await body.locator("img").evaluateAll(nodes => nodes.map(node => node.getAttribute("src")!))) {
    expect(restored).toContain(src);
  }
  const downloading = page.waitForEvent("download");
  await page.getByTestId("export-note").click();
  expect(readFileSync((await (await downloading).path())!, "utf8")).toContain(await pasted.getAttribute("src"));
  await page.getByRole("button", { name:"공유", exact:true }).click();
  await page.getByTestId("start-sharing").click();
  const guest = await browser.newContext();
  try {
    const shared = await guest.newPage();
    await shared.goto(await page.getByTestId("share-link").inputValue());
    const picture = shared.getByTestId("shared-body").getByAltText("붙여넣기.png");
    await expect(picture).toBeVisible();
    await expect.poll(() => picture.evaluate(node => (node as HTMLImageElement).naturalHeight)).toBe(960);
  } finally {
    await guest.close();
    await page.getByRole("button", { name:"공유 중지" }).click();
  }
});
