import {
  expect,
  test,
  type APIRequestContext,
  type Page,
} from "@playwright/test";
import {
  signUpAndEnter,
  signInAndEnter,
  uniqueUsername,
  TEST_PASSWORD,
} from "./support/account";

async function saved(page: Page, before: string) {
  await expect(page.getByTestId("save-state")).not.toHaveAttribute(
    "data-saved-count",
    before,
    { timeout: 20_000 },
  );
  await expect(page.getByTestId("save-state")).toHaveAttribute(
    "data-state",
    "saved",
  );
}
async function edit(page: Page, title: string, format: string, text: string) {
  const count = (await page
    .getByTestId("save-state")
    .getAttribute("data-saved-count"))!;
  await page.getByLabel("노트 제목").fill(title);
  const body = page.getByTestId("note-body");
  if (format === "canvas") {
    await page.getByRole("button", { name: "글상자", exact: true }).click();
    await body.click({ position: { x: 80, y: 80 } });
    await page.getByLabel("글상자 내용").fill(text);
    await page.getByLabel("글상자 내용").press("Enter");
  } else if (format === "doc") {
    await body.evaluate((el, value) => {
      el.innerHTML = `<p><strong>${value}</strong></p>`;
      el.dispatchEvent(new InputEvent("input", { bubbles: true }));
    }, text);
  } else await body.fill(`# ${text}\n\n**서식 보존**`);
  await saved(page, count);
}
async function choose(page: Page, title: string) {
  await page.getByLabel("복원 지점").click();
  await page.getByRole("option").filter({ hasText: title }).click();
  await expect(page.getByTestId("revision-preview")).toContainText(title);
}
async function restore(page: Page) {
  await page.getByRole("button", { name: "이 버전 복원", exact: true }).click();
  await page.getByRole("button", { name: "복원하기", exact: true }).click();
  await expect(page.getByRole("dialog")).toHaveCount(0);
}

for (const [format, name] of [
  ["doc", "일반 문서"],
  ["markdown", "Markdown"],
  ["canvas", "그림판"],
]) {
  test(`R06: ${name}의 제목·본문 미리보기와 복원, 복원 취소가 재진입 후에도 유지된다`, async ({
    page,
  }) => {
    test.setTimeout(150_000);
    await signUpAndEnter(page);
    await page.getByRole("button", { name: "새 노트 만들기" }).first().click();
    await page.getByRole("button", { name }).click();
    await expect(page.getByTestId("note-body")).toBeVisible();
    await edit(page, "처음 완성한 제목", format, "처음 본문");
    await edit(page, "두 번째 제목", format, "두 번째 본문");
    await page.reload();
    await expect(page.getByTestId("note-body")).toBeVisible();
    await page.getByRole("button", { name: "수정 이력", exact: true }).click();
    await choose(page, "처음 완성한 제목");
    const preview = page.getByTestId("revision-preview");
    await expect(preview).toContainText("처음 본문");
    if (format === "doc")
      await expect(preview.locator("strong")).toHaveText("처음 본문");
    if (format === "markdown")
      await expect(preview.locator("h1")).toHaveText("처음 본문");
    if (format === "canvas")
      await expect(preview.locator("svg text")).toHaveText("처음 본문");
    await restore(page);
    await expect(page.getByLabel("노트 제목")).toHaveValue("처음 완성한 제목");
    if (format === "canvas") {
      await expect(
        page
          .getByTestId("note-actions")
          .getByRole("button", { name: "되돌리기", exact: true }),
      ).toBeDisabled();
    }
    if (format === "markdown")
      await expect(page.getByTestId("note-body")).toHaveValue(
        "# 처음 본문\n\n**서식 보존**",
      );
    else await expect(page.getByTestId("note-body")).toContainText("처음 본문");
    await page.getByRole("button", { name: "수정 이력", exact: true }).click();
    await choose(page, "두 번째 제목");
    await expect(preview).toContainText("두 번째 본문");
    await restore(page);
    await page.reload();
    await expect(page.getByLabel("노트 제목")).toHaveValue("두 번째 제목");
    // 복원 후 편집도 새 버전에서 정상 저장한다.
    await edit(page, "복원 이후 편집", format, "이어서 쓴 본문");
    await page.reload();
    await expect(page.getByLabel("노트 제목")).toHaveValue("복원 이후 편집");
  });
}

test("R06: 좁은 화면에서 이력을 읽고 저장 대기·오프라인 초안을 보호한다", async ({
  page,
  context,
}) => {
  await signUpAndEnter(page);
  await page.getByRole("button", { name: "새 노트 만들기" }).first().click();
  await page.getByRole("button", { name: "일반 문서" }).click();
  await expect(page.getByTestId("note-body")).toBeVisible();
  await edit(page, "안전한 과거 제목", "doc", "보존한 본문");
  await edit(page, "현재 제목", "doc", "현재 본문");
  await page.setViewportSize({ width: 320, height: 700 });
  await context.setOffline(true);
  await page.getByLabel("노트 제목").fill("오프라인 초안");
  await expect(page.getByTestId("save-state")).toHaveAttribute(
    "data-state",
    "offline",
  );
  await page.getByRole("button", { name: "수정 이력", exact: true }).click();
  await expect(page.getByRole("dialog")).toBeVisible();
  const bounds = (await page.getByRole("dialog").boundingBox())!;
  expect(bounds.x).toBeGreaterThanOrEqual(0);
  expect(bounds.x + bounds.width).toBeLessThanOrEqual(320);
  await expect(page.getByRole("dialog")).toContainText(
    "이력을 불러오지 못했습니다.",
  );
  await context.setOffline(false);
  await page
    .getByRole("button", { name: "다시 불러오기", exact: true })
    .click();
  await choose(page, "안전한 과거 제목");
  await expect(
    page.getByRole("button", { name: "이 버전 복원", exact: true }),
  ).toBeDisabled();
  await expect(page.getByRole("dialog")).toContainText(
    "현재 내용의 저장이 끝나야",
  );
  await page.getByRole("button", { name: "닫기", exact: true }).click();
  await expect(page.getByLabel("노트 제목")).toHaveValue("오프라인 초안");
  await page.reload();
  await expect(page.getByLabel("노트 제목")).toHaveValue("오프라인 초안");
  await expect(page.getByTestId("save-state")).toHaveAttribute(
    "data-state",
    "saved",
    { timeout: 20_000 },
  );
});

test("R06: 다른 기기의 저장 후 복원 요청은 충돌을 알리고 양쪽 내용을 유지한다", async ({
  page,
  browser,
}) => {
  const username = await signUpAndEnter(page);
  await page.getByRole("button", { name: "새 노트 만들기" }).first().click();
  await page.getByRole("button", { name: "일반 문서" }).click();
  await expect(page.getByTestId("note-body")).toBeVisible();
  await edit(page, "이력의 원본", "doc", "원래 내용");
  await edit(page, "열어 둔 내용", "doc", "내 기기의 내용");
  const url = page.url();
  await page.getByRole("button", { name: "수정 이력", exact: true }).click();
  await choose(page, "이력의 원본");
  const other = await browser.newContext({ locale: "ko-KR" });
  try {
    const device = await other.newPage();
    await signInAndEnter(device, username);
    await device.goto(url);
    await expect(device.getByTestId("note-body")).toBeVisible();
    await edit(device, "다른 기기 최신본", "doc", "새 기기의 내용");
    await restore(page);
    await expect(page.getByTestId("save-state")).toHaveAttribute(
      "data-state",
      "conflict",
    );
    await expect(page.getByLabel("노트 제목")).toHaveValue("열어 둔 내용");
    await page
      .getByRole("button", { name: "최신 내용 불러오기", exact: true })
      .click();
    await expect(page.getByLabel("노트 제목")).toHaveValue("다른 기기 최신본");
    await expect(page.getByTestId("note-body")).toContainText("새 기기의 내용");
  } finally {
    await other.close();
  }
});

test("R06: 실제 DB의 보관 제한·소유자 권한·설정 유지·휴지통을 검증한다", async ({
  request,
}) => {
  test.setTimeout(150_000);
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL!;
  const key = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!;
  async function account(client: APIRequestContext) {
    const username = uniqueUsername("revs");
    const response = await client.post(`${url}/auth/v1/signup`, {
      headers: { apikey: key },
      data: {
        email: `${username}@users.amunote.internal`,
        password: TEST_PASSWORD,
        data: { username },
      },
    });
    expect(response.ok()).toBe(true);
    const data = await response.json();
    return {
      id: data.user.id,
      headers: {
        apikey: key,
        Authorization: `Bearer ${data.access_token}`,
        Prefer: "return=representation",
      },
    };
  }
  const own = await account(request);
  const other = await account(request);
  const created = await request.post(`${url}/rest/v1/notes`, {
    headers: own.headers,
    data: {
      owner_id: own.id,
      format: "doc",
      title: "A",
      content: { html: "A" },
    },
  });
  expect(created.ok()).toBe(true);
  let [note] = await created.json();
  const endpoint = `${url}/rest/v1/notes?id=eq.${note.id}`;
  const history = `${url}/rest/v1/note_revisions?note_id=eq.${note.id}&order=created_at.desc,version.desc`;
  async function rows(headers = own.headers) {
    const response = await request.get(history, { headers });
    expect(response.ok()).toBe(true);
    return response.json();
  }
  async function patch(data: object) {
    const response = await request.patch(endpoint, {
      headers: own.headers,
      data,
    });
    expect(response.ok()).toBe(true);
    [note] = await response.json();
  }
  async function rpc(
    id: string,
    version = note.version,
    headers = own.headers,
  ) {
    const response = await request.post(
      `${url}/rest/v1/rpc/restore_note_revision`,
      {
        headers,
        data: {
          target_note: note.id,
          target_revision: id,
          expected_version: version,
        },
      },
    );
    expect(response.ok()).toBe(true);
    return response.json();
  }
  await patch({
    title: "B",
    content: { html: "B" },
    version: note.version + 1,
  });
  const [initial] = await rows();
  expect(initial.title).toBe("A");
  await patch({
    title: "C",
    content: { html: "C" },
    version: note.version + 1,
  });
  const [rolling] = await rows();
  await patch({
    title: "D",
    content: { html: "D" },
    version: note.version + 1,
  });
  expect(await rows()).toHaveLength(2);
  expect((await rows())[0].title).toBe("C");
  expect(await rpc(rolling.id)).toEqual({ status: "missing" });
  const folderResponse = await request.post(`${url}/rest/v1/folders`, {
    headers: own.headers,
    data: { owner_id: own.id, name: "현재 폴더" },
  });
  expect(folderResponse.ok()).toBe(true);
  const [folder] = await folderResponse.json();
  await patch({
    folder_id: folder.id,
    is_pinned: true,
    background: { kind: "color", value: "#eef3fb" },
    share_token: crypto.randomUUID(),
  });
  expect(await rows()).toHaveLength(2);
  expect(await rows(other.headers)).toEqual([]);
  expect(await rpc(initial.id, note.version, other.headers)).toEqual({
    status: "missing",
  });
  for (const method of ["post", "patch", "delete"] as const) {
    const response = await request[method](history, {
      headers: own.headers,
      ...(method === "delete" ? {} : { data: { title: "변경 금지" } }),
    });
    expect(response.ok()).toBe(false);
  }
  const anon = await request.get(history, { headers: { apikey: key } });
  expect(anon.ok()).toBe(false);
  const anonRestore = await request.post(
    `${url}/rest/v1/rpc/restore_note_revision`,
    {
      headers: { apikey: key },
      data: {
        target_note: note.id,
        target_revision: initial.id,
        expected_version: note.version,
      },
    },
  );
  expect(anonRestore.ok()).toBe(false);
  const settings = {
    background: note.background,
    is_pinned: note.is_pinned,
    folder_id: note.folder_id,
    share_token: note.share_token,
  };
  const result = await rpc(initial.id);
  expect(result.status).toBe("restored");
  note.version = result.note.version;
  const current = (
    await (await request.get(endpoint, { headers: own.headers })).json()
  )[0];
  expect(current).toMatchObject({
    ...settings,
    title: "A",
    content: { html: "A" },
  });
  for (let index = 0; index < 51; index++) {
    const [latest] = await rows();
    const restored = await rpc(latest.id);
    expect(restored.status).toBe("restored");
    note.version = restored.note.version;
  }
  expect(await rows()).toHaveLength(50);
  expect(
    (await rows()).some((row: { id: string }) => row.id === initial.id),
  ).toBe(false);
  await patch({ deleted_at: new Date().toISOString() });
  expect(await rows()).toEqual([]);
  await patch({ deleted_at: null });
  expect(await rows()).toHaveLength(50);
  const removed = await request.delete(endpoint, { headers: own.headers });
  expect(removed.ok()).toBe(true);
  expect(await rows()).toEqual([]);
});
