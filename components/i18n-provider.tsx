"use client";

import { createContext, use } from "react";
import { en } from "@/lib/i18n/dictionaries/en";
import type { Locale } from "@/lib/i18n/locales";
import type { Messages } from "@/lib/i18n/messages";

interface Translation {
  locale: Locale;
  t: Messages;
}

// 서버가 정한 언어를 클라이언트 컴포넌트까지 그대로 내려보낸다.
// 기본값은 화면에 쓰이지 않는다. Provider가 항상 감싸기 때문이다.
const TranslationContext = createContext<Translation>({ locale: "en", t: en });

export function I18nProvider({
  locale,
  messages,
  children,
}: {
  locale: Locale;
  messages: Messages;
  children: React.ReactNode;
}) {
  return (
    <TranslationContext value={{ locale, t: messages }}>
      {children}
    </TranslationContext>
  );
}

/** 클라이언트 컴포넌트에서 쓰는 문구. */
export function useMessages(): Messages {
  return use(TranslationContext).t;
}

export function useLocale(): Locale {
  return use(TranslationContext).locale;
}
