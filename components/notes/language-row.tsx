"use client";

import { useTransition } from "react";
import { setDisplayLocale } from "@/lib/i18n/actions";
import { LOCALES, type Locale } from "@/lib/i18n/locales";
import { useMessages } from "@/components/i18n-provider";

/**
 * 설정의 표시 언어. 고른 값은 계정에 저장되므로 다른 기기에서 열어도 그대로다.
 * 노트 내용은 사용자의 것이라 여기서 바뀌지 않는다.
 */
export function LanguageRow({ locale }: { locale: Locale }) {
  const t = useMessages();
  const [pending, startTransition] = useTransition();

  return (
    <div className="flex items-center justify-between gap-4">
      <div className="flex flex-col gap-1">
        <p className="text-sm font-medium">{t.settings.languageLabel}</p>
        <p className="text-sm text-muted-foreground">{t.settings.languageBody}</p>
      </div>

      <select
        aria-label={t.settings.languageLabel}
        data-testid="language-select"
        value={locale}
        disabled={pending}
        onChange={(event) => {
          const next = event.target.value as Locale;
          startTransition(async () => {
            await setDisplayLocale(next);
          });
        }}
        className="h-9 flex-none rounded-md border border-border bg-card px-2 text-sm"
      >
        {LOCALES.map((option) => (
          <option key={option.code} value={option.code}>
            {option.label}
          </option>
        ))}
      </select>
    </div>
  );
}
