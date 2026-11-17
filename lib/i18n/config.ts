// Ngôn ngữ của giao diện. Tiếng Việt là mặc định và không có tiền tố URL (/viec-lam); ngôn ngữ khác có tiền tố (/en/viec-lam).
export const LOCALES = ["vi", "en", "zh", "ja", "fil", "hi"] as const;
export type Locale = (typeof LOCALES)[number];
export const DEFAULT_LOCALE: Locale = "vi";

export const hasLocale = (v: unknown): v is Locale => typeof v === "string" && (LOCALES as readonly string[]).includes(v);

// Tên ngôn ngữ viết bằng chính ngôn ngữ đó (cho nút chọn ngôn ngữ) và mã BCP 47 cho <html lang> / hreflang.
export const LOCALE_LABEL: Record<Locale, string> = { vi: "Tiếng Việt", en: "English", zh: "中文", ja: "日本語", fil: "Filipino", hi: "हिन्दी" };
export const HTML_LANG: Record<Locale, string> = { vi: "vi", en: "en", zh: "zh-Hans", ja: "ja", fil: "fil", hi: "hi" };
export const OG_LOCALE: Record<Locale, string> = { vi: "vi_VN", en: "en_US", zh: "zh_CN", ja: "ja_JP", fil: "fil_PH", hi: "hi_IN" };

/** Đường dẫn nội bộ theo ngôn ngữ: localePath("en", "/viec-lam?q=1") → "/en/viec-lam?q=1"; tiếng Việt giữ nguyên. */
export function localePath(lang: Locale, path: string): string {
  if (lang === DEFAULT_LOCALE) return path;
  return path === "/" ? `/${lang}` : `/${lang}${path}`;
}

/** Tách tiền tố ngôn ngữ khỏi pathname: "/en/viec-lam" → { lang: "en", rest: "/viec-lam" }. */
export function splitLocale(pathname: string): { lang: Locale; rest: string } {
  const seg = pathname.split("/")[1];
  if (hasLocale(seg) && seg !== DEFAULT_LOCALE) return { lang: seg, rest: pathname.slice(seg.length + 1) || "/" };
  return { lang: DEFAULT_LOCALE, rest: pathname };
}

/** alternates.languages cho metadata (hreflang), từ một đường dẫn tiếng Việt. */
export function languageAlternates(path: string): Record<string, string> {
  return Object.fromEntries([...LOCALES.map((l) => [HTML_LANG[l], localePath(l, path)]), ["x-default", path]]);
}
