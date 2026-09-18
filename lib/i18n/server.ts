import { cache } from "react";
import { headers } from "next/headers";
import { currentProfile } from "@/lib/account/profile";
import { DICTIONARIES } from "@/lib/i18n/dictionaries";
import {
  isLocale,
  localeFromAcceptLanguage,
  type Locale,
} from "@/lib/i18n/locales";
import type { Messages } from "@/lib/i18n/messages";

/**
 * 이번 요청의 표시 언어.
 * 계정에 저장된 언어가 먼저고, 없으면 브라우저가 보낸 Accept-Language를 따른다.
 * 지원하지 않는 언어면 영어로 시작한다.
 */
export const currentLocale = cache(async (): Promise<Locale> => {
  const profile = await currentProfile();
  const saved = profile?.locale;
  if (isLocale(saved)) return saved;

  const requestHeaders = await headers();
  return localeFromAcceptLanguage(requestHeaders.get("accept-language"));
});

/**
 * 이번 요청의 문구 한 벌. 서버 컴포넌트가 이것을 받아 화면에 쓴다.
 * layout, generateMetadata, page가 저마다 부르므로 요청마다 한 번만 고른다.
 */
export const getMessages = cache(
  async (): Promise<{ locale: Locale; t: Messages }> => {
    const locale = await currentLocale();
    return { locale, t: DICTIONARIES[locale] };
  },
);
