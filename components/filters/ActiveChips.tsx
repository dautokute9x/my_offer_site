import Link from "next/link";
import { filtersToQuery, hasActiveFilters, type JobFilters } from "@/lib/filters";
import type { Catalog } from "@/lib/types";
import { catalogName, prefectureName } from "@/lib/i18n/catalog";
import { localePath } from "@/lib/i18n/config";
import { fmt } from "@/lib/i18n/format";
import { getT } from "@/lib/i18n/server";

export default async function ActiveChips({ filters: f, catalog }: { filters: JobFilters; catalog: Catalog }) {
  if (!hasActiveFilters(f)) return null;
  const { lang, t } = await getT();
  const C = t.jobs.chips;
  const chips: { label: string; next: Partial<JobFilters> }[] = [];
  if (f.q) chips.push({ label: fmt(C.keyword, { v: f.q }), next: { q: "" } });
  for (const code of f.prefectures) {
    const p = catalog.prefectures.find((x) => x.code === code)!;
    chips.push({ label: prefectureName(lang, p), next: { prefectures: f.prefectures.filter((x) => x !== code) } });
  }
  for (const s of f.groups) {
    const g = catalog.groups.find((x) => x.slug === s)!;
    chips.push({ label: fmt(C.group, { v: catalogName(lang, t, "groups", g) }), next: { groups: f.groups.filter((x) => x !== s) } });
  }
  for (const s of f.occupations) {
    const o = catalog.occupations.find((x) => x.slug === s)!;
    chips.push({ label: catalogName(lang, t, "occupations", o), next: { occupations: f.occupations.filter((x) => x !== s) } });
  }
  if (f.salaryMinMan != null || f.salaryMaxMan != null) {
    chips.push({
      label: fmt(C.salary, { period: f.period === "year" ? t.salary.year : t.salary.month, min: f.salaryMinMan ?? "", max: f.salaryMaxMan ?? "" }),
      next: { salaryMinMan: null, salaryMaxMan: null },
    });
  }
  if (f.jpLevel) chips.push({ label: fmt(C.jp, { v: f.jpLevel === "none" ? C.jpNone : f.jpLevel }), next: { jpLevel: null } });
  if (f.maxExperience != null) chips.push({ label: fmt(C.experience, { n: f.maxExperience }), next: { maxExperience: null } });
  for (const s of f.benefits) {
    const b = catalog.benefits.find((x) => x.slug === s)!;
    chips.push({ label: catalogName(lang, t, "benefits", b), next: { benefits: f.benefits.filter((x) => x !== s) } });
  }
  if (f.hasInterview) chips.push({ label: C.interview, next: { hasInterview: false } });
  const href = (next: Partial<JobFilters>) => {
    const qs = filtersToQuery({ ...f, ...next, page: 1 });
    return localePath(lang, qs ? `/viec-lam?${qs}` : "/viec-lam");
  };
  return (
    <ul className="flex flex-wrap items-center gap-2" aria-label={C.label}>
      {chips.map((c) => (
        <li key={c.label}>
          <Link href={href(c.next)} aria-label={fmt(C.remove, { v: c.label })}
            className="inline-flex min-h-11 items-center gap-2 border border-ink bg-paper px-3 text-sm text-ink transition-colors duration-200 hover:bg-paper-2">
            {c.label} <span aria-hidden className="text-muted">✕</span>
          </Link>
        </li>
      ))}
      <li>
        <Link href={localePath(lang, "/viec-lam")} className="link inline-flex min-h-11 items-center px-2 text-sm text-muted">{C.clearAll}</Link>
      </li>
    </ul>
  );
}
