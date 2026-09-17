import { describe, expect, it } from "vitest";
import {
  BACKGROUND_COLORS,
  DEFAULT_BACKGROUND,
  backgroundStyle,
  parseBackground,
  rejectBackgroundFile,
} from "@/lib/notes/background";

describe("parseBackground", () => {
  it("저장된 값을 그대로 읽는다", () => {
    expect(parseBackground({ kind: "color", value: "#fffaf0" })).toEqual({
      kind: "color",
      value: "#fffaf0",
    });
    expect(parseBackground({ kind: "image", path: "uid/a.jpg" })).toEqual({
      kind: "image",
      path: "uid/a.jpg",
    });
  });

  it("비었거나 모르는 값은 기본 배경으로 본다", () => {
    expect(parseBackground(null)).toEqual(DEFAULT_BACKGROUND);
    expect(parseBackground({ kind: "hologram" })).toEqual(DEFAULT_BACKGROUND);
    expect(parseBackground({ kind: "color" })).toEqual(DEFAULT_BACKGROUND);
  });

  it("팔레트에 없는 색은 받지 않는다. 읽을 수 있는 배경만 쓴다", () => {
    expect(parseBackground({ kind: "color", value: "#000000" })).toEqual(
      DEFAULT_BACKGROUND,
    );
  });
});

describe("backgroundStyle", () => {
  it("색 배경은 그대로 칠한다", () => {
    expect(backgroundStyle({ kind: "color", value: "#fffaf0" }, null)).toEqual({
      backgroundColor: "#fffaf0",
    });
  });

  it("이미지 배경은 흰 막을 한 겹 깔아 글자가 묻히지 않게 한다", () => {
    const style = backgroundStyle({ kind: "image", path: "uid/a.jpg" }, "https://x/a");
    expect(style.backgroundImage).toContain("linear-gradient");
    expect(style.backgroundImage).toContain("https://x/a");
    expect(style.backgroundSize).toBe("cover");
  });

  it("이미지 주소를 아직 못 받았으면 기본 배경으로 둔다", () => {
    expect(backgroundStyle({ kind: "image", path: "uid/a.jpg" }, null)).toEqual({
      backgroundColor: DEFAULT_BACKGROUND.value,
    });
  });
});

describe("rejectBackgroundFile", () => {
  const file = (type: string, size: number) => ({ type, size }) as File;

  it("JPG와 PNG는 받는다", () => {
    expect(rejectBackgroundFile(file("image/jpeg", 1024))).toBeNull();
    expect(rejectBackgroundFile(file("image/png", 1024))).toBeNull();
  });

  it("다른 형식은 왜 안 되는지 알린다", () => {
    expect(rejectBackgroundFile(file("image/gif", 1024))).toBe(
      "JPG와 PNG만 올릴 수 있습니다.",
    );
  });

  it("5MB를 넘으면 왜 안 되는지 알린다", () => {
    expect(rejectBackgroundFile(file("image/png", 5 * 1024 * 1024 + 1))).toBe(
      "5MB까지 올릴 수 있습니다.",
    );
  });
});

describe("BACKGROUND_COLORS", () => {
  it("프로토타입이 정한 다섯 가지다", () => {
    expect(BACKGROUND_COLORS.map((color) => color.value)).toEqual([
      "#ffffff",
      "#fffaf0",
      "#f2f7f4",
      "#eef3fb",
      "#fbeef3",
    ]);
  });
});
