// 표시 언어. 스펙이 정한 아홉 가지이고, 이름은 그 언어로 적는다.
export const LOCALES = [
  { code: "en", label: "English" },
  { code: "fr", label: "Français" },
  { code: "de", label: "Deutsch" },
  { code: "it", label: "Italiano" },
  { code: "es", label: "Español" },
  { code: "zh-Hans", label: "简体中文" },
  { code: "zh-Hant", label: "繁體中文" },
  { code: "ja", label: "日本語" },
  { code: "ko", label: "한국어" },
] as const;

export type Locale = (typeof LOCALES)[number]["code"];

/** 지원 목록에 없는 언어로 들어오면 영어로 시작한다. */
export const DEFAULT_LOCALE: Locale = "en";

const CODES = LOCALES.map((locale) => locale.code) as readonly string[];

export function isLocale(value: unknown): value is Locale {
  return typeof value === "string" && CODES.includes(value);
}

// 번체를 쓰는 지역. 그 밖의 중국어는 간체로 본다.
const TRADITIONAL_REGIONS = ["tw", "hk", "mo"];

function toLocale(tag: string): Locale | null {
  const [language, ...rest] = tag.toLowerCase().split("-");

  if (language === "zh") {
    if (rest.includes("hant") || rest.some((part) => TRADITIONAL_REGIONS.includes(part))) {
      return "zh-Hant";
    }
    return "zh-Hans";
  }

  return isLocale(language) ? language : null;
}

/**
 * 처음 들어온 사람의 언어. 브라우저가 보낸 Accept-Language를 품질 값 순으로
 * 훑어 지원하는 첫 언어를 고른다.
 */
export function localeFromAcceptLanguage(header: string | null): Locale {
  if (!header) return DEFAULT_LOCALE;

  const ranked = header
    .split(",")
    .map((part) => {
      const [tag, ...params] = part.trim().split(";");
      const quality = params
        .map((param) => param.trim())
        .find((param) => param.startsWith("q="));
      return { tag: tag.trim(), q: quality ? Number(quality.slice(2)) : 1 };
    })
    .filter((entry) => entry.tag && !Number.isNaN(entry.q))
    .sort((a, b) => b.q - a.q);

  for (const entry of ranked) {
    const locale = toLocale(entry.tag);
    if (locale) return locale;
  }

  return DEFAULT_LOCALE;
}
