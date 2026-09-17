import { describe, expect, it } from "vitest";
import {
  DEFAULT_LOCALE,
  LOCALES,
  isLocale,
  localeFromAcceptLanguage,
} from "@/lib/i18n/locales";

describe("LOCALES", () => {
  it("스펙이 정한 아홉 개다", () => {
    expect(LOCALES.map((locale) => locale.code)).toEqual([
      "en",
      "fr",
      "de",
      "it",
      "es",
      "zh-Hans",
      "zh-Hant",
      "ja",
      "ko",
    ]);
  });

  it("각 언어의 이름은 그 언어로 적는다", () => {
    const names = Object.fromEntries(
      LOCALES.map((locale) => [locale.code, locale.label]),
    );
    expect(names.ko).toBe("한국어");
    expect(names.ja).toBe("日本語");
    expect(names["zh-Hans"]).toBe("简体中文");
    expect(names["zh-Hant"]).toBe("繁體中文");
  });
});

describe("isLocale", () => {
  it("지원하는 코드만 받는다", () => {
    expect(isLocale("ko")).toBe(true);
    expect(isLocale("zh-Hant")).toBe(true);
    expect(isLocale("pt")).toBe(false);
    expect(isLocale(null)).toBe(false);
  });
});

describe("localeFromAcceptLanguage", () => {
  it("브라우저가 가장 앞에 둔 언어를 따른다", () => {
    expect(localeFromAcceptLanguage("ko-KR,ko;q=0.9,en;q=0.8")).toBe("ko");
    expect(localeFromAcceptLanguage("fr-CA,fr;q=0.9")).toBe("fr");
  });

  it("품질 값이 높은 쪽을 먼저 본다", () => {
    expect(localeFromAcceptLanguage("en;q=0.3,ja;q=0.9")).toBe("ja");
  });

  it("중국어는 간체와 번체를 지역으로 가른다", () => {
    expect(localeFromAcceptLanguage("zh-CN")).toBe("zh-Hans");
    expect(localeFromAcceptLanguage("zh-TW")).toBe("zh-Hant");
    expect(localeFromAcceptLanguage("zh-Hant-HK")).toBe("zh-Hant");
    // 지역이 없는 zh는 간체로 본다
    expect(localeFromAcceptLanguage("zh")).toBe("zh-Hans");
  });

  it("지원하지 않는 언어면 영어로 시작한다", () => {
    expect(localeFromAcceptLanguage("pt-BR,pt;q=0.9")).toBe(DEFAULT_LOCALE);
    expect(localeFromAcceptLanguage("")).toBe(DEFAULT_LOCALE);
    expect(localeFromAcceptLanguage(null)).toBe(DEFAULT_LOCALE);
  });

  it("지원하는 언어가 뒤에 있어도 찾아낸다", () => {
    expect(localeFromAcceptLanguage("pt-BR,pt;q=0.9,de;q=0.5")).toBe("de");
  });
});
