import { describe, expect, it } from "vitest";
import { isShareToken, shareUrl } from "@/lib/notes/share";

const TOKEN = "3f2a1b7c-5d6e-4f80-9a1b-2c3d4e5f6071";

describe("isShareToken", () => {
  it("열쇠 모양만 받는다", () => {
    expect(isShareToken(TOKEN)).toBe(true);
    expect(isShareToken(TOKEN.toUpperCase())).toBe(true);
  });

  it("열쇠가 아닌 것은 거른다", () => {
    expect(isShareToken("")).toBe(false);
    expect(isShareToken("notes")).toBe(false);
    expect(isShareToken(`${TOKEN} or 1=1`)).toBe(false);
    expect(isShareToken(`${TOKEN}extra`)).toBe(false);
  });
});

describe("shareUrl", () => {
  it("열쇠를 붙인 주소를 만든다", () => {
    expect(shareUrl("https://amu.example", TOKEN)).toBe(
      `https://amu.example/share/${TOKEN}`,
    );
  });

  it("끝에 붙은 빗금은 하나로 본다", () => {
    expect(shareUrl("https://amu.example/", TOKEN)).toBe(
      `https://amu.example/share/${TOKEN}`,
    );
  });
});
