import type { Locale } from "@/lib/i18n/locales";
import type { Messages } from "@/lib/i18n/messages";
import { de } from "@/lib/i18n/dictionaries/de";
import { en } from "@/lib/i18n/dictionaries/en";
import { es } from "@/lib/i18n/dictionaries/es";
import { fr } from "@/lib/i18n/dictionaries/fr";
import { it } from "@/lib/i18n/dictionaries/it";
import { ja } from "@/lib/i18n/dictionaries/ja";
import { ko } from "@/lib/i18n/dictionaries/ko";
import { zhHans } from "@/lib/i18n/dictionaries/zh-Hans";
import { zhHant } from "@/lib/i18n/dictionaries/zh-Hant";

export const DICTIONARIES: Record<Locale, Messages> = {
  en,
  fr,
  de,
  it,
  es,
  "zh-Hans": zhHans,
  "zh-Hant": zhHant,
  ja,
  ko,
};
