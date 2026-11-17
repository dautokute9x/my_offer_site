import Link from "next/link";
import { filtersToQuery, hasActiveFilters, type JobFilters } from "@/lib/filters";
import type { Catalog } from "@/lib/types";

export default function ActiveChips({ filters: f, catalog }: { filters: JobFilters; catalog: Catalog }) {
  if (!hasActiveFilters(f)) return null;
  const chips: { label: string; next: Partial<JobFilters> }[] = [];
  if (f.q) chips.push({ label: `Từ khóa: ${f.q}`, next: { q: "" } });
  for (const code of f.prefectures) {
    const p = catalog.prefectures.find((x) => x.code === code)!;
    chips.push({ label: p.nameVi, next: { prefectures: f.prefectures.filter((x) => x !== code) } });
  }
  for (const s of f.groups) {
    const g = catalog.groups.find((x) => x.slug === s)!;
    chips.push({ label: `Nhóm: ${g.nameVi}`, next: { groups: f.groups.filter((x) => x !== s) } });
  }
  for (const s of f.occupations) {
    const o = catalog.occupations.find((x) => x.slug === s)!;
    chips.push({ label: o.nameVi, next: { occupations: f.occupations.filter((x) => x !== s) } });
  }
  if (f.salaryMinMan != null || f.salaryMaxMan != null) {
    chips.push({
      label: `Lương ${f.period === "year" ? "năm" : "tháng"}: ${f.salaryMinMan ?? ""}–${f.salaryMaxMan ?? ""} 万円`,
      next: { salaryMinMan: null, salaryMaxMan: null },
    });
  }
  if (f.jpLevel) chips.push({ label: `Tiếng Nhật: ${f.jpLevel === "none" ? "không yêu cầu" : f.jpLevel}`, next: { jpLevel: null } });
  if (f.maxExperience != null) chips.push({ label: `Kinh nghiệm ≤ ${f.maxExperience} năm`, next: { maxExperience: null } });
  for (const s of f.benefits) {
    const b = catalog.benefits.find((x) => x.slug === s)!;
    chips.push({ label: b.nameVi, next: { benefits: f.benefits.filter((x) => x !== s) } });
  }
  if (f.hasInterview) chips.push({ label: "Có lịch phỏng vấn", next: { hasInterview: false } });
  const href = (next: Partial<JobFilters>) => {
    const qs = filtersToQuery({ ...f, ...next, page: 1 });
    return qs ? `/viec-lam?${qs}` : "/viec-lam";
  };
  return (
    <ul className="flex flex-wrap items-center gap-2" aria-label="Bộ lọc đang áp dụng">
      {chips.map((c) => (
        <li key={c.label}>
          <Link href={href(c.next)} aria-label={`Bỏ lọc: ${c.label}`}
            className="inline-flex min-h-11 items-center gap-2 border border-ink bg-paper px-3 text-sm text-ink transition-colors duration-200 hover:bg-paper-2">
            {c.label} <span aria-hidden className="text-muted">✕</span>
          </Link>
        </li>
      ))}
      <li>
        <Link href="/viec-lam" className="link inline-flex min-h-11 items-center px-2 text-sm text-muted">Xóa tất cả</Link>
      </li>
    </ul>
  );
}
