import { expect, test } from "@playwright/test";
import { readFileSync } from "node:fs";
import { signUpAndEnter } from "./support/account";
import {
  BACKUP_PNG,
  backupAccount,
  backupRest,
  backupUrl,
  seedBackup,
} from "./support/backup";
import { decodeBackup } from "../lib/notes/backup-file";

test.use({ trace: "retain-on-failure" });

test("R08: 다른 계정에 세 형식·중첩 폴더·이미지·휴지통·이력을 복원하고 원본은 유지한다", async ({
  page,
  browser,
  request,
}, info) => {
  test.setTimeout(210_000);
  const source = await backupAccount(request, await signUpAndEnter(page));
  const seeded = await seedBackup(request, source);
  const sourceRest = backupRest(request, source);
  const original = await sourceRest.rows("notes?order=id");
  await page.goto("/settings");
  const downloadPromise = page.waitForEvent("download");
  await page
    .getByRole("button", { name: "전체 백업 다운로드", exact: true })
    .click();
  const download = await downloadPromise;
  const path = info.outputPath("whole-backup.zip");
  await download.saveAs(path);
  const bytes = readFileSync(path);
  const { manifest, images } = decodeBackup(bytes);
  expect(manifest.folders).toHaveLength(5);
  expect(manifest.notes).toHaveLength(5);
  expect(manifest.revisions).toHaveLength(4);
  expect(manifest.images).toHaveLength(1);
  expect(Buffer.from(images[manifest.images[0].path])).toEqual(BACKUP_PNG);
  expect(JSON.stringify(manifest)).not.toContain(source.id);
  expect(JSON.stringify(manifest)).not.toContain(
    original.find((note: { id: string }) => note.id === seeded.doc).share_token,
  );

  const targetContext = await browser.newContext({ locale: "ko-KR" });
  try {
    const targetPage = await targetContext.newPage();
    targetPage.setDefaultTimeout(15_000);
    targetPage.setDefaultNavigationTimeout(20_000);
    const target = await backupAccount(
      request,
      await signUpAndEnter(targetPage),
    );
    const targetRest = backupRest(request, target);
    const [kept] = await targetRest.insert("notes", {
      owner_id: target.id,
      format: "doc",
      title: "원래 문서",
      content: { html: "<p>기존 계정의 원문</p>" },
    });
    await targetRest.patch(`profiles?id=eq.${target.id}`, {
      default_background: { kind: "color", value: "#fffaf0" },
    });
    const beforeProfile = await targetRest.rows(`profiles?id=eq.${target.id}`);
    await targetPage.goto("/settings");
    await expect(
      targetPage.getByLabel("백업 파일", { exact: true }),
    ).toBeEnabled();
    await targetPage
      .getByLabel("백업 파일", { exact: true })
      .setInputFiles(path);
    const dialog = targetPage.getByRole("dialog");
    await expect(dialog).toContainText("기존 자료는 유지");
    await expect(targetPage.getByTestId("backup-summary")).toContainText("4");
    expect(await targetRest.rows("notes")).toHaveLength(1);
    let restoreUrl = "";
    targetPage.on("request", (req) => {
      if (req.url().includes("/api/backup/restore")) restoreUrl = req.url();
    });
    await dialog.getByRole("button", { name: "복원하기", exact: true }).click();
    await expect(targetPage.getByTestId("backup-success")).toBeVisible({
      timeout: 30_000,
    });
    const copies = await targetRest.rows(`notes?id=neq.${kept.id}`);
    expect(copies).toHaveLength(5);
    for (const copy of copies) {
      const before = manifest.notes.find((note) => note.title === copy.title)!;
      expect(copy.id).not.toBe(before.id);
      expect(copy.share_token).toBeNull();
      expect(copy.version).toBe(before.version);
      expect(copy.content).toEqual(before.content);
      expect(copy.is_pinned).toBe(before.is_pinned);
      expect(copy.format).toBe(before.format);
      if (before.background.kind === "color")
        expect(copy.background).toEqual(before.background);
      expect(Date.parse(copy.created_at)).toBe(Date.parse(before.created_at));
      expect(Date.parse(copy.updated_at)).toBe(Date.parse(before.updated_at));
    }
    const doc = copies.find(
      (note: { format: string; deleted_at: string | null }) =>
        note.format === "doc" && !note.deleted_at,
    );
    expect(doc.background.path.startsWith(`${target.id}/`)).toBe(true);
    const imageUrl = `${backupUrl()}/storage/v1/object/note-backgrounds/${doc.background.path}`;
    const image = await request.get(imageUrl, { headers: target.headers });
    expect(image.ok()).toBe(true);
    expect(await image.body()).toEqual(BACKUP_PNG);
    expect(
      (await request.get(imageUrl, { headers: source.headers })).ok(),
    ).toBe(false);
    expect(await targetRest.rows(`notes?id=eq.${kept.id}`)).toEqual([kept]);
    expect(await targetRest.rows(`profiles?id=eq.${target.id}`)).toEqual(
      beforeProfile,
    );
    expect(await sourceRest.rows("notes?order=id")).toEqual(original);
    const rootLink = targetPage.getByRole("button", {
      name: "복원 폴더 열기",
      exact: true,
    });
    const rootUrl = (await rootLink.getAttribute("href"))!;
    await rootLink.click();
    await expect(
      targetPage.getByTestId("folder-item").filter({ hasText: "업무" }),
    ).toBeVisible();
    await targetPage
      .getByTestId("folder-item")
      .filter({ hasText: "업무" })
      .click();
    await expect(
      targetPage.getByTestId("folder-item").filter({ hasText: "빈 폴더" }),
    ).toBeVisible();
    await targetPage.goto(`/notes/${doc.id}`);
    await expect(
      targetPage.getByTestId("note-body").locator("strong"),
    ).toHaveCSS("color", "rgb(179, 18, 63)");
    await targetPage
      .getByRole("button", { name: "수정 이력", exact: true })
      .click();
    await expect(targetPage.getByTestId("revision-preview")).toContainText(
      "예전 본문",
    );
    await targetPage
      .getByRole("button", { name: "이 버전 복원", exact: true })
      .click();
    await targetPage
      .getByRole("button", { name: "복원하기", exact: true })
      .click();
    await expect(targetPage.getByLabel("노트 제목")).toHaveValue("문서 이전");
    const retry = await targetPage.request.post(restoreUrl, {
      headers: { "Content-Type": "application/zip" },
      data: bytes,
    });
    expect(retry.ok()).toBe(true);
    expect(await targetRest.rows("notes")).toHaveLength(6);
    expect((await targetRest.rows(`notes?id=eq.${doc.id}`))[0].title).toBe(
      "문서 이전",
    );
    const canvas = copies.find(
      (note: { format: string }) => note.format === "canvas",
    );
    await targetPage.goto(`/notes/${canvas.id}`);
    await expect(targetPage.getByTestId("canvas-element")).toHaveCount(3);
    await targetPage
      .getByRole("button", { name: "글상자", exact: true })
      .click();
    await targetPage
      .getByTestId("note-body")
      .click({ position: { x: 150, y: 150 } });
    await targetPage.getByLabel("글상자 내용").fill("복원 후 새 요소");
    await targetPage.getByLabel("글상자 내용").press("Enter");
    await expect(targetPage.getByTestId("save-state")).not.toHaveAttribute(
      "data-saved-count",
      "0",
      { timeout: 20_000 },
    );
    await targetPage.reload();
    await expect(targetPage.getByTestId("canvas-element")).toHaveCount(4);
    await targetPage.goto("/trash");
    const group = targetPage
      .getByTestId("trash-row")
      .filter({ hasText: "지운 폴더" });
    await group.getByRole("button", { name: "되돌리기", exact: true }).click();
    await expect(group).toHaveCount(0);
    const trashed = copies.find(
      (note: { title: string }) => note.title === "휴지통 문서",
    );
    expect(
      (await targetRest.rows(`notes?id=eq.${trashed.id}`))[0].deleted_at,
    ).toBeNull();
    expect(
      await targetRest.rows(`note_revisions?note_id=eq.${trashed.id}`),
    ).toHaveLength(1);
    await targetPage.goto(rootUrl);
    await expect(
      targetPage.getByTestId("folder-item").filter({ hasText: "업무" }),
    ).toBeVisible();
    const markdown = copies.find(
      (note: { format: string; deleted_at: string | null }) =>
        note.format === "markdown" && !note.deleted_at,
    );
    await targetPage.goto(`/notes/${markdown.id}`);
    await targetPage.getByTestId("note-body").fill("# 복원 뒤 수정한 원문");
    await expect(targetPage.getByTestId("save-state")).not.toHaveAttribute(
      "data-saved-count",
      "0",
      { timeout: 20_000 },
    );
    await expect(targetPage.getByTestId("save-state")).toHaveAttribute(
      "data-state",
      "saved",
    );
    await targetPage.reload();
    await expect(targetPage.getByTestId("note-body")).toHaveValue(
      "# 복원 뒤 수정한 원문",
    );
    // 성공 후 같은 파일을 새로 선택하면 기존 복사본도 유지한 채 별도 복원한다.
    await targetPage.goto("/settings");
    await expect(
      targetPage.getByLabel("백업 파일", { exact: true }),
    ).toBeEnabled();
    await targetPage
      .getByLabel("백업 파일", { exact: true })
      .setInputFiles(path);
    await targetPage
      .getByRole("dialog")
      .getByRole("button", { name: "복원하기", exact: true })
      .click();
    await expect(targetPage.getByTestId("backup-success")).toBeVisible({
      timeout: 30_000,
    });
    expect(await targetRest.rows("notes")).toHaveLength(11);
    expect(
      await targetPage
        .getByRole("button", { name: "복원 폴더 열기", exact: true })
        .getAttribute("href"),
    ).not.toBe(rootUrl);
  } finally {
    await targetContext.close().catch(() => {});
  }
});

test("R08: 빈 백업 확인·취소와 잘못된 파일을 구분하고 좁은 화면에서 사용한다", async ({
  page,
  request,
}, info) => {
  const account = await backupAccount(request, await signUpAndEnter(page));
  const rest = backupRest(request, account);
  await page.goto("/settings");
  const response = await page.request.get("/api/backup");
  expect(response.ok()).toBe(true);
  const bytes = await response.body();
  expect(decodeBackup(bytes).manifest.notes).toHaveLength(0);
  await page.setViewportSize({ width: 320, height: 700 });
  await expect(page.getByLabel("백업 파일", { exact: true })).toBeEnabled();
  await page.getByLabel("백업 파일", { exact: true }).setInputFiles({
    name: "empty.zip",
    mimeType: "application/zip",
    buffer: bytes,
  });
  await expect(page.getByRole("dialog")).toBeVisible();
  const box = (await page.getByRole("dialog").boundingBox())!;
  expect(box.x).toBeGreaterThanOrEqual(0);
  expect(box.x + box.width).toBeLessThanOrEqual(320);
  await page.screenshot({ path: info.outputPath("backup-mobile.png") });
  await page.getByRole("button", { name: "취소", exact: true }).click();
  expect(await rest.rows("folders")).toHaveLength(0);
  await page.getByLabel("백업 파일", { exact: true }).setInputFiles({
    name: "broken.zip",
    mimeType: "application/zip",
    buffer: Buffer.from([1, 2, 3]),
  });
  await expect(
    page.getByTestId("backup-card").getByRole("alert"),
  ).toContainText("파일이 손상");
  await expect(page.getByRole("dialog")).toHaveCount(0);
  expect(await rest.rows("notes")).toHaveLength(0);
  expect(await rest.rows("folders")).toHaveLength(0);
});

test("R08: 비로그인 백업·확인·복원 요청을 거절한다", async ({ request }) => {
  const download = await request.get("/api/backup");
  expect(download.status()).toBe(401);
  for (const path of ["/api/backup", "/api/backup/restore"]) {
    const response = await request.post(path, { data: "invalid" });
    expect(response.status()).toBe(401);
  }
});
