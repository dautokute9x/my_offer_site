import type { Locale } from "./config";
import type { Messages } from "./messages";

type Named = { nameVi: string; nameJa?: string | null };

/** Tên nhóm nghề / nghề / quyền lợi theo ngôn ngữ: vi dùng tên trong DB, ja dùng tên tiếng Nhật, ngôn ngữ khác tra bản dịch theo slug. */
export function catalogName(lang: Locale, t: Messages, kind: "groups" | "occupations" | "benefits", item: Named & { slug: string }): string {
  if (lang === "vi") return item.nameVi;
  if (lang === "ja" && item.nameJa) return item.nameJa;
  return (t.catalog[kind] as Record<string, string>)[item.slug] ?? item.nameVi;
}

/** Tên tỉnh: chữ Hán ở bản ja/zh, romaji ở các bản còn lại. */
export const prefectureName = (lang: Locale, p: Named) => ((lang === "ja" || lang === "zh") && p.nameJa ? p.nameJa : p.nameVi);
