import type { CSSProperties } from "react";

// 노트 배경. 프로토타입이 정한 다섯 가지 색과, 사용자가 올린 이미지 한 장.
// 색은 모두 옅어서 검은 본문 글자가 그대로 읽힌다.
// 이름은 사전이 가진다. 여기에는 값만 둔다.
export const BACKGROUND_COLORS = [
  { value: "#ffffff" },
  { value: "#fffaf0" },
  { value: "#f2f7f4" },
  { value: "#eef3fb" },
  { value: "#fbeef3" },
] as const;

export type ColorBackground = { kind: "color"; value: string };
export type ImageBackground = { kind: "image"; path: string };
export type NoteBackground = ColorBackground | ImageBackground;

export const DEFAULT_BACKGROUND: ColorBackground = {
  kind: "color",
  value: BACKGROUND_COLORS[0].value,
};

/** 배경 이미지 보관 규칙. 버킷 쪽에서도 같은 값으로 막는다. */
export const BACKGROUND_BUCKET = "note-backgrounds";
export const ALLOWED_TYPES = ["image/jpeg", "image/png"];
export const MAX_BYTES = 5 * 1024 * 1024;

// 사진이 아무리 진해도 글자가 묻히지 않도록 흰 막을 한 겹 깐다.
const SCRIM = "rgba(255, 255, 255, 0.72)";

/** 저장소에서 온 값을 배경으로 읽는다. 읽을 수 없으면 기본 배경으로 본다. */
export function parseBackground(raw: unknown): NoteBackground {
  if (!raw || typeof raw !== "object") return DEFAULT_BACKGROUND;
  const candidate = raw as Record<string, unknown>;

  if (candidate.kind === "image" && typeof candidate.path === "string") {
    return { kind: "image", path: candidate.path };
  }

  if (candidate.kind === "color" && typeof candidate.value === "string") {
    // 팔레트 밖의 색은 받지 않는다. 진한 색이 들어오면 본문을 읽을 수 없다.
    const known = BACKGROUND_COLORS.some((color) => color.value === candidate.value);
    if (known) return { kind: "color", value: candidate.value };
  }

  return DEFAULT_BACKGROUND;
}

/**
 * 글 쓰는 면에 입힐 스타일. 이미지는 비공개 버킷에 있으므로 서버가 만들어 준
 * 서명된 주소를 받는다. 아직 못 받았으면 기본 배경으로 둔다.
 */
export function backgroundStyle(
  background: NoteBackground,
  imageUrl: string | null,
): CSSProperties {
  if (background.kind === "color") {
    return { backgroundColor: background.value };
  }

  if (!imageUrl) return { backgroundColor: DEFAULT_BACKGROUND.value };

  return {
    backgroundImage: `linear-gradient(${SCRIM}, ${SCRIM}), url("${imageUrl}")`,
    backgroundSize: "cover",
    backgroundPosition: "center",
  };
}

/**
 * 목록에 있는 배경들 중 이미지 경로만 골라낸다. 서명된 주소를 한 번에 받아
 * 목록이 이미지 수만큼 왕복하지 않게 하려는 것이다.
 */
export function imagePathsOf(items: { background?: unknown }[]): string[] {
  const paths = new Set<string>();
  for (const item of items) {
    const background = parseBackground(item.background);
    if (background.kind === "image") paths.add(background.path);
  }
  return [...paths];
}

/** 한꺼번에 받아 둔 주소 중 이 배경의 것. 색 배경이면 주소가 필요 없다. */
export function imageUrlOf(
  background: NoteBackground,
  urls: Record<string, string>,
): string | null {
  return background.kind === "image" ? (urls[background.path] ?? null) : null;
}

export type RejectReason = "type" | "size";

/**
 * 올릴 수 없는 파일이면 그 이유를 돌려준다. 올릴 수 있으면 null이다.
 * 문구가 아니라 이유만 돌려주어 화면이 표시 언어에 맞는 말을 고르게 한다.
 */
export function rejectBackgroundFile(file: File): RejectReason | null {
  if (!ALLOWED_TYPES.includes(file.type)) return "type";
  if (file.size > MAX_BYTES) return "size";
  return null;
}
