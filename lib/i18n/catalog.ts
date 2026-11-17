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

/** Tên tin: bản tiếng Nhật dùng tên gốc tiếng Nhật (nếu có); các bản khác dùng tên tiếng Việt. */
export const jobTitle = (lang: Locale, j: { titleVi: string; titleJa?: string | null }) => (lang === "ja" && j.titleJa ? j.titleJa : j.titleVi);
/** Dòng tên phụ dưới tiêu đề: ngược với jobTitle (tiếng Việt ở bản ja, tiếng Nhật ở bản khác). */
export const jobSubtitle = (lang: Locale, j: { titleVi: string; titleJa?: string | null }) =>
  lang === "ja" && j.titleJa ? { text: j.titleVi, lang: "vi" } : { text: j.titleJa ?? "", lang: "ja" };
