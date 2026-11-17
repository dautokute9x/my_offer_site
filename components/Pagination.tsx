import { filtersToQuery, type JobFilters } from "@/lib/filters";

export default function Pagination({ filters, pageCount }: { filters: JobFilters; pageCount: number }) {
  if (pageCount <= 1) return null;
  const href = (page: number) => `/viec-lam${filtersToQuery({ ...filters, page }) ? "?" + filtersToQuery({ ...filters, page }) : ""}`;
  const cls = "inline-flex min-h-11 min-w-11 items-center justify-center border border-rule-2 bg-paper px-3 text-sm tabular-nums transition-colors duration-200 hover:border-ink";
  const pages = Array.from({ length: pageCount }, (_, i) => i + 1).filter(
    (p) => p === 1 || p === pageCount || Math.abs(p - filters.page) <= 1,
  );
  return (
    <nav aria-label="Phân trang" className="mt-10 flex flex-wrap items-center gap-2">
      {filters.page > 1 && <a href={href(filters.page - 1)} className={cls} rel="prev">Trang trước</a>}
      {pages.map((p, i) => (
        <span key={p} className="contents">
          {i > 0 && p - pages[i - 1] > 1 && <span aria-hidden>…</span>}
          <a href={href(p)} aria-current={p === filters.page ? "page" : undefined}
            className={`${cls} ${p === filters.page ? "border-ink bg-ink font-bold text-paper" : "text-ink"}`}>
            {p}
          </a>
        </span>
      ))}
      {filters.page < pageCount && <a href={href(filters.page + 1)} className={cls} rel="next">Trang sau</a>}
    </nav>
  );
}
