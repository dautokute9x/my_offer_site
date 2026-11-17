import "server-only";
import { lang as rootLang } from "next/root-params";
import { DEFAULT_LOCALE, hasLocale, type Locale } from "./config";
import { MESSAGES, type Messages } from "./messages";

/** Ngôn ngữ của request hiện tại (từ segment [lang]); ngoài [lang] (trang quản trị) là tiếng Việt. */
export async function getLang(): Promise<Locale> {
  try {
    const l = await rootLang();
    return hasLocale(l) ? l : DEFAULT_LOCALE;
  } catch {
    return DEFAULT_LOCALE;
  }
}

export async function getT(): Promise<{ lang: Locale; t: Messages }> {
  const lang = await getLang();
  return { lang, t: MESSAGES[lang] };
}
