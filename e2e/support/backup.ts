import { expect, type APIRequestContext } from "@playwright/test";
import { TEST_PASSWORD } from "./account";

export const BACKUP_PNG = Buffer.from(
  "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==",
  "base64",
);
export const backupUrl = () => process.env.NEXT_PUBLIC_SUPABASE_URL!;
const key = () => process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!;
export async function backupAccount(
  request: APIRequestContext,
  username: string,
) {
  const response = await request.post(
    `${backupUrl()}/auth/v1/token?grant_type=password`,
    {
      headers: { apikey: key() },
      data: {
        email: `${username}@users.amunote.internal`,
        password: TEST_PASSWORD,
      },
    },
  );
  expect(response.ok()).toBe(true);
  const data = await response.json();
  return {
    id: data.user.id as string,
    headers: {
      apikey: key(),
      Authorization: `Bearer ${data.access_token}`,
      Prefer: "return=representation",
    },
  };
}
export function backupRest(
  request: APIRequestContext,
  account: Awaited<ReturnType<typeof backupAccount>>,
) {
  const endpoint = (table: string) => `${backupUrl()}/rest/v1/${table}`;
  return {
    async rows(table: string) {
      const response = await request.get(endpoint(table), {
        headers: account.headers,
      });
      expect(response.ok()).toBe(true);
      return response.json();
    },
    async insert(table: string, data: object) {
      const response = await request.post(endpoint(table), {
        headers: account.headers,
        data,
      });
      expect(response.ok(), await response.text()).toBe(true);
      return response.json();
    },
    async patch(table: string, data: object) {
      const response = await request.patch(endpoint(table), {
        headers: account.headers,
        data,
      });
      expect(response.ok()).toBe(true);
      return response.json();
    },
  };
}

export async function seedBackup(
  request: APIRequestContext,
  account: Awaited<ReturnType<typeof backupAccount>>,
) {
  const rest = backupRest(request, account);
  const root = crypto.randomUUID(),
    nested = crypto.randomUUID(),
    empty = crypto.randomUUID(),
    trash = crypto.randomUUID(),
    child = crypto.randomUUID();
  const deleted = new Date().toISOString();
  await rest.insert(
    "folders",
    [
      { id: root, owner_id: account.id, name: "업무", parent_id: null },
      { id: nested, owner_id: account.id, name: "회의", parent_id: root },
      { id: empty, owner_id: account.id, name: "빈 폴더", parent_id: root },
      {
        id: trash,
        owner_id: account.id,
        name: "지운 폴더",
        parent_id: root,
        deleted_at: deleted,
        trash_root_id: trash,
      },
      {
        id: child,
        owner_id: account.id,
        name: "휴지통 하위",
        parent_id: trash,
        deleted_at: deleted,
        trash_root_id: trash,
      },
    ].map((row) => ({ deleted_at: null, trash_root_id: null, ...row })),
  );
  const imagePath = `${account.id}/${crypto.randomUUID()}.png`;
  const upload = await request.post(
    `${backupUrl()}/storage/v1/object/note-backgrounds/${imagePath}`,
    {
      headers: { ...account.headers, "Content-Type": "image/png" },
      data: BACKUP_PNG,
    },
  );
  expect(upload.ok()).toBe(true);
  const doc = crypto.randomUUID(),
    md = crypto.randomUUID(),
    canvas = crypto.randomUUID(),
    trashed = crypto.randomUUID(),
    solo = crypto.randomUUID();
  const points = [
    {
      id: crypto.randomUUID(),
      kind: "pen",
      points: [20, 30, 50, 60],
      color: "#b3123f",
      width: 4,
    },
  ];
  await rest.insert(
    "notes",
    [
      {
        id: doc,
        owner_id: account.id,
        folder_id: nested,
        format: "doc",
        title: "문서 이전",
        content: { html: "<p>예전 본문</p>" },
        background: { kind: "image", path: imagePath },
        is_pinned: true,
      },
      {
        id: md,
        owner_id: account.id,
        format: "markdown",
        title: "Markdown 이전",
        content: { source: "# 이전 원문", viewer: false },
      },
      {
        id: canvas,
        owner_id: account.id,
        folder_id: root,
        format: "canvas",
        title: "그림 이전",
        content: { elements: points },
        background: { kind: "color", value: "#eef3fb" },
      },
      {
        id: trashed,
        owner_id: account.id,
        folder_id: child,
        format: "doc",
        title: "휴지통 이전",
        content: { html: "<p>지우기 전 기록</p>" },
      },
      {
        id: solo,
        owner_id: account.id,
        format: "markdown",
        title: "낱개 휴지통",
        content: { source: "따로 지운 원문", viewer: true },
        deleted_at: deleted,
        trash_root_id: solo,
      },
    ].map((row) => ({
      folder_id: null,
      is_pinned: false,
      background: { kind: "color", value: "#ffffff" },
      deleted_at: null,
      trash_root_id: null,
      ...row,
    })),
  );
  const html =
    '<p><strong style="color:#b3123f;font-size:22px">현재 본문</strong></p><ul><li>첫째<ul><li>둘째</li></ul></li></ul>';
  const elements = [
    ...points,
    {
      id: crypto.randomUUID(),
      kind: "text",
      text: "편집 가능한 글상자",
      x: 100,
      y: 120,
      size: 24,
      color: "#2b2b2b",
    },
    {
      id: crypto.randomUUID(),
      kind: "rect",
      x1: 10,
      y1: 10,
      x2: 90,
      y2: 100,
      color: "#1d4ed8",
      width: 2,
    },
  ];
  await rest.patch(`notes?id=eq.${doc}`, {
    title: "원래 문서",
    content: { html },
    preview: "현재 본문 첫째 둘째",
    version: 2,
    share_token: crypto.randomUUID(),
  });
  await rest.patch(`notes?id=eq.${md}`, {
    title: "Markdown 현재",
    content: { source: "# 현재 원문\n\n- **굵은 목록**", viewer: false },
    preview: "현재 원문",
    version: 2,
  });
  await rest.patch(`notes?id=eq.${canvas}`, {
    title: "그림 현재",
    content: { elements },
    preview: JSON.stringify(elements),
    version: 2,
  });
  await rest.patch(`notes?id=eq.${trashed}`, {
    title: "휴지통 문서",
    content: { html: "<p>되살릴 기록</p>" },
    version: 2,
  });
  await rest.patch(`notes?id=eq.${trashed}`, {
    deleted_at: deleted,
    trash_root_id: trash,
  });
  return { doc, md, canvas, trashed, imagePath, html, elements };
}
