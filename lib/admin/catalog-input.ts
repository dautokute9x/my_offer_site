export type CatalogKind = "group" | "occupation" | "skill" | "benefit" | "prefecture";
export type CatalogErrors = Record<string, string>;
export type CatalogRow = Record<string, string | number | boolean | string[]>;

export const CATALOG_TABLE: Record<CatalogKind, string> = {
  group: "occupation_groups", occupation: "occupations", skill: "skills", benefit: "benefits", prefecture: "prefectures",
};
export const isKind = (v: unknown): v is CatalogKind => typeof v === "string" && Object.hasOwn(CATALOG_TABLE, v);
export const positiveId = (v: unknown) => (/^\d{1,9}$/.test(String(v ?? "")) && Number(v) > 0 ? Number(v) : null);

const SLUG = /^[a-z0-9]+(-[a-z0-9]+)*$/;

export function parseCatalog(kind: CatalogKind, fd: FormData, groupIds: ReadonlySet<number> = new Set()): { row: CatalogRow } | { errors: CatalogErrors } {
  const errors: CatalogErrors = {};
  const s = (k: string) => String(fd.get(k) ?? "").trim();
  const row: CatalogRow = {};
  const name = (k: string, label: string) => {
    const v = s(k);
    if (!v || v.length > 100) errors[k] = `${label}: nhập 1–100 ký tự.`;
    row[k] = v;
  };
  if (kind === "group" || kind === "occupation" || kind === "benefit") {
    const slug = s("slug");
    if (!SLUG.test(slug) || slug.length > 60) errors.slug = "Slug chỉ gồm a-z, 0-9, dấu gạch ngang (tối đa 60 ký tự).";
    row.slug = slug;
  }
  if (kind === "skill") name("name", "Tên kỹ năng");
  else name("name_vi", "Tên tiếng Việt");
  if (kind !== "skill" && kind !== "prefecture") name("name_ja", "Tên tiếng Nhật");
  if (kind === "occupation") {
    const g = positiveId(s("group_id"));
    if (g == null || !groupIds.has(g)) errors.group_id = "Chọn nhóm nghề hợp lệ.";
    else row.group_id = g;
  }
  if (kind === "group" || kind === "benefit") {
    const n = s("sort");
    if (n && !/^\d{1,4}$/.test(n)) errors.sort = "Thứ tự là số nguyên 0–9999.";
    row.sort = n ? Number(n) : 0;
  }
  if (kind === "benefit") row.featured = fd.get("featured") === "on";
  if (kind === "occupation" || kind === "skill" || kind === "prefecture") {
    const aliases = [...new Set(s("aliases").split(",").map((a) => a.trim()).filter(Boolean))];
    if (aliases.some((a) => a.length > 100)) errors.aliases = "Mỗi alias tối đa 100 ký tự.";
    row.aliases = aliases;
  }
  return Object.keys(errors).length ? { errors } : { row };
}
