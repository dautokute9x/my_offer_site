import type { Catalog, InterviewEvent, JpLevel, Job } from "@/lib/types";

export type JobFilters = {
  q: string; prefectures: string[]; groups: string[]; occupations: string[];
  salaryMinMan: number | null; salaryMaxMan: number | null; period: "month" | "year";
  jpLevel: JpLevel | null; maxExperience: number | null; benefits: string[];
  hasInterview: boolean; sort: "moi" | "pv" | "luong"; page: number;
};

export type JobSummary = Job & { nextInterview: InterviewEvent | null };

type SP = Record<string, string | string[] | undefined>;

const first = (v: string | string[] | undefined) => (Array.isArray(v) ? v[0] : v) ?? "";
const list = (v: string | string[] | undefined, allowed: Set<string>) =>
  [...new Set(first(v).split(",").map((x) => x.trim()).filter((x) => allowed.has(x)))];
const int = (s: string) => (/^\d{1,6}$/.test(s) ? Number(s) : null);
const LEVELS = ["N1", "N2", "N3", "N4", "N5", "none"];

export function parseFilters(sp: SP, catalog: Catalog): JobFilters {
  const m = /^(\d*)-(\d*)$/.exec(first(sp.luong));
  const level = first(sp.tiengnhat);
  const kn = int(first(sp.kn));
  const sx = first(sp.sx);
  const page = int(first(sp.trang));
  return {
    q: first(sp.q).trim(),
    prefectures: list(sp.tinh, new Set(catalog.prefectures.map((p) => p.code))),
    groups: list(sp.nhom, new Set(catalog.groups.map((g) => g.slug))),
    occupations: list(sp.nghe, new Set(catalog.occupations.map((o) => o.slug))),
    salaryMinMan: m && m[1] ? Number(m[1]) : null,
    salaryMaxMan: m && m[2] ? Number(m[2]) : null,
    period: first(sp.ky) === "nam" ? "year" : "month",
    jpLevel: LEVELS.includes(level) ? (level as JpLevel) : null,
    maxExperience: kn,
    benefits: list(sp.ql, new Set(catalog.benefits.map((b) => b.slug))),
    hasInterview: first(sp.pv) === "1",
    sort: sx === "pv" || sx === "luong" ? sx : "moi",
    page: page && page >= 1 ? page : 1,
  };
}

export function filtersToQuery(f: JobFilters): string {
  const p = new URLSearchParams();
  if (f.q) p.set("q", f.q);
  if (f.prefectures.length) p.set("tinh", f.prefectures.join(","));
  if (f.groups.length) p.set("nhom", f.groups.join(","));
  if (f.occupations.length) p.set("nghe", f.occupations.join(","));
  if (f.salaryMinMan != null || f.salaryMaxMan != null) p.set("luong", `${f.salaryMinMan ?? ""}-${f.salaryMaxMan ?? ""}`);
  if (f.period === "year") p.set("ky", "nam");
  if (f.jpLevel) p.set("tiengnhat", f.jpLevel);
  if (f.maxExperience != null) p.set("kn", String(f.maxExperience));
  if (f.benefits.length) p.set("ql", f.benefits.join(","));
  if (f.hasInterview) p.set("pv", "1");
  if (f.sort !== "moi") p.set("sx", f.sort);
  if (f.page > 1) p.set("trang", String(f.page));
  return p.toString();
}

// Không tính `sort`, `page` và `period` (chỉ có nghĩa khi có lọc lương).
export function hasActiveFilters(f: JobFilters): boolean {
  return !!(f.q || f.prefectures.length || f.groups.length || f.occupations.length || f.salaryMinMan != null ||
    f.salaryMaxMan != null || f.jpLevel || f.maxExperience != null || f.benefits.length || f.hasInterview);
}

export const jobHref = (job: Pick<Job, "slug" | "code">) => `/viec-lam/${job.slug}-${job.code}`;
