import { headers } from "next/headers";
import { createClient } from "@/lib/supabase/server";
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
export async function currentLocale(): Promise<Locale> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (user) {
    const { data } = await supabase
      .from("profiles")
      .select("locale")
      .eq("id", user.id)
      .maybeSingle();

    if (isLocale(data?.locale)) return data.locale;
  }

  const requestHeaders = await headers();
  return localeFromAcceptLanguage(requestHeaders.get("accept-language"));
}

/** 이번 요청의 문구 한 벌. 서버 컴포넌트가 이것을 받아 화면에 쓴다. */
export async function getMessages(): Promise<{
  locale: Locale;
  t: Messages;
}> {
  const locale = await currentLocale();
  return { locale, t: DICTIONARIES[locale] };
}
