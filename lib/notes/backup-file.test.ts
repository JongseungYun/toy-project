import { expect, it } from "vitest";
import { createHash } from "node:crypto";
import { zipSync, strToU8 } from "fflate";
import type { NoteBackup } from "./backup-types";
import type { DocContent } from "./types";
import { decodeBackup, encodeBackup } from "./backup-file";

const id = "11111111-1111-4111-8111-111111111111";
const date = "2026-11-01T00:00:00Z";
const image = new Uint8Array(
  Buffer.from(
    "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+jRZkAAAAASUVORK5CYII=",
    "base64",
  ),
);
const path = `images/${id}.png`;
const backup: NoteBackup = {
  format: "amu-note-backup",
  version: 1,
  created_at: date,
  folders: [],
  revisions: [],
  notes: [
    {
      id,
      folder_id: null,
      format: "doc",
      title: "한글 기록",
      content: {
        html: '<p><strong style="color:#b3123f">서식 보존</strong></p>',
      },
      preview: "서식 보존",
      version: 1,
      is_pinned: true,
      background: { kind: "image", path },
      created_at: date,
      updated_at: date,
      deleted_at: null,
      trash_root_id: null,
    },
  ],
  images: [
    {
      path,
      mime: "image/png",
      sha256: createHash("sha256").update(image).digest("hex"),
    },
  ],
};

it("전용 백업 파일에서 한글 제목·서식과 배경 이미지 원본 바이트가 유지된다", () => {
  const decoded = decodeBackup(encodeBackup(backup, { [path]: image }));
  expect(decoded.manifest).toEqual(backup);
  expect(decoded.images[path]).toEqual(image);
});

function rawFile(value: unknown, asset = image) {
  const bytes = strToU8(JSON.stringify(value));
  return zipSync({
    "manifest.json": bytes,
    "manifest.sha256": strToU8(
      createHash("sha256").update(bytes).digest("hex"),
    ),
    [path]: asset,
  });
}

it.each([
  [
    "빠진 폴더",
    (copy: NoteBackup) => {
      copy.notes[0].folder_id = "22222222-2222-4222-8222-222222222222";
    },
  ],
  [
    "중복 노트",
    (copy: NoteBackup) => {
      copy.notes.push(copy.notes[0]);
    },
  ],
  [
    "잘못된 본문",
    (copy: NoteBackup) => {
      copy.notes[0].content = { html: 123 };
    },
  ],
  [
    "잘못된 버전",
    (copy: NoteBackup) => {
      copy.notes[0].version = 0;
    },
  ],
  [
    "빠진 이미지 참조",
    (copy: NoteBackup) => {
      copy.images = [];
    },
  ],
])("파일 검증: %s 항목이 잘못되면 복원 전에 거절한다", (_name, mutate) => {
  const copy = structuredClone(backup);
  mutate(copy);
  expect(() => decodeBackup(rawFile(copy))).toThrow();
});

it("파일의 실행 코드를 제거하면서 지원하는 본문 서식을 보존한다", () => {
  const copy = structuredClone(backup);
  copy.notes[0].content = {
    html: '<p><strong style="color:#b3123f">안전한 서식</strong><img src=x onerror="alert(1)"><a href="java&#x73;cript:alert(1)">링크</a><script>alert(1)</script></p>',
  };
  const decoded = decodeBackup(rawFile(copy));
  const html = (decoded.manifest.notes[0].content as DocContent).html;
  expect(html).toContain('<strong style="color:#b3123f">안전한 서식</strong>');
  expect(html).toContain("링크");
  expect(html).not.toMatch(/script|onerror|alert\(|<img/i);
});

it("이미지 내용이나 전용 명세가 손상되면 성공한 백업으로 읽지 않는다", () => {
  const changed = image.slice();
  changed[changed.length - 1] ^= 1;
  expect(() => decodeBackup(rawFile(backup, changed))).toThrow("invalid");
  const wrongDigest = zipSync({
    "manifest.json": strToU8(JSON.stringify(backup)),
    "manifest.sha256": strToU8("0".repeat(64)),
    [path]: image,
  });
  expect(() => decodeBackup(wrongDigest)).toThrow("invalid");
});

it("지원하지 않는 버전과 지원 크기를 넘는 파일을 구분한다", () => {
  expect(() => decodeBackup(rawFile({ ...backup, version: 2 }))).toThrow(
    "unsupported",
  );
  expect(() => decodeBackup(new Uint8Array(67_108_865))).toThrow("tooLarge");
});

it("순환하는 폴더 관계를 가진 파일은 복원 전에 거절한다", () => {
  const copy = structuredClone(backup);
  const a = "22222222-2222-4222-8222-222222222222",
    b = "33333333-3333-4333-8333-333333333333";
  copy.folders = [a, b].map((id, index) => ({
    id,
    parent_id: index === 0 ? b : a,
    name: "순환",
    created_at: date,
    updated_at: date,
    deleted_at: null,
    trash_root_id: null,
  }));
  expect(() => decodeBackup(rawFile(copy))).toThrow("invalid");
});
