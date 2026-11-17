import type { Metadata } from "next";
import Link from "next/link";
import { getCatalog, searchJobs } from "@/lib/data";
import { filtersToQuery, hasActiveFilters, parseFilters } from "@/lib/filters";
import JobCard from "@/components/JobCard";
import Pagination from "@/components/Pagination";
import ViewToggle from "@/components/ViewToggle";
import ActiveChips from "@/components/filters/ActiveChips";
import FilterPanel from "@/components/filters/FilterPanel";
import { JobsNav, JobsResults, SortSelect } from "@/components/filters/JobsNav";

type Props = { searchParams: Promise<Record<string, string | string[] | undefined>> };

export async function generateMetadata({ searchParams }: Props): Promise<Metadata> {
  const f = parseFilters(await searchParams, await getCatalog());
  return {
    title: "Việc làm kỹ sư tại Nhật",
    alternates: { canonical: "/viec-lam" },
    ...(hasActiveFilters(f) && { robots: { index: false, follow: true } }),
  };
}

export default async function JobsPage({ searchParams }: Props) {
  const sp = await searchParams;
  const catalog = await getCatalog();
  const f = parseFilters(sp, catalog);
  const { items, total, pageCount } = await searchJobs(f, { simulateError: sp.demo_error === "1" });
  const sorts = [["moi", "Mới cập nhật"], ["pv", "Lịch phỏng vấn gần nhất"], ["luong", "Lương cao nhất"]];
  return (
    // Thứ tự DOM: tìm kiếm trước bộ lọc (bàn phím); lưới CSS giữ sidebar bên trái ở lg.
    <JobsNav className="grid gap-8 lg:grid-cols-[18rem_minmax(0,1fr)] lg:gap-x-12">
      <section className="min-w-0 space-y-6 lg:col-start-2 lg:row-start-1">
        <h1 className="text-[length:var(--text-display-s)]">Việc làm kỹ sư tại Nhật</h1>
        <form action="/viec-lam" method="get" className="flex flex-wrap items-end gap-3">
          {/* Giữ các bộ lọc khác; đổi từ khóa hoặc sắp xếp thì về trang 1. */}
          {[...new URLSearchParams(filtersToQuery({ ...f, q: "", sort: "moi", page: 1 }))].map(([k, v]) => (
            <input key={k} type="hidden" name={k} value={v} />
          ))}
          <label className="min-w-0 flex-1 basis-56 text-sm text-ink">Tìm kiếm
            <input name="q" type="search" defaultValue={f.q} placeholder="Mã tin, chức danh, kỹ năng…" className="field mt-1" />
          </label>
          <label className="text-sm text-ink">Sắp xếp
            <SortSelect defaultValue={f.sort} className="field mt-1">
              {sorts.map(([v, l]) => <option key={v} value={v}>{l}</option>)}
            </SortSelect>
          </label>
          <button className="btn btn-primary">Tìm</button>
        </form>
      </section>
      <aside className="lg:sticky lg:top-4 lg:col-start-1 lg:row-span-2 lg:row-start-1 lg:max-h-[calc(100vh-2rem)] lg:self-start lg:overflow-y-auto">
        <FilterPanel catalog={catalog} filters={f} total={total} />
      </aside>
      <JobsResults className="min-w-0 space-y-6 lg:col-start-2 lg:row-start-2">
        <ActiveChips filters={f} catalog={catalog} />
        <ViewToggle summary={<p role="status" className="display-face text-2xl">Tìm thấy {total} việc làm</p>}>
          {items.length === 0 ? (
            <div className="opens py-10">
              <p className="display-face text-[length:var(--text-title)]">Không tìm thấy việc làm phù hợp</p>
              <p className="prose-body mt-2">Thử bỏ bớt bộ lọc hoặc tìm bằng mã tin.</p>
              <div className="mt-6 flex flex-wrap gap-3">
                {f.page > 1 && total > 0 && (
                  <a href={`/viec-lam${filtersToQuery({ ...f, page: 1 }) ? "?" + filtersToQuery({ ...f, page: 1 }) : ""}`}
                    className="btn btn-primary">Về trang 1</a>
                )}
                {hasActiveFilters(f) && (
                  <Link href="/viec-lam" className="btn">Xóa bộ lọc</Link>
                )}
              </div>
            </div>
          ) : (
            <div className="grid grid-cols-1 border-t-2 border-accent-2 border-b border-b-rule group-data-[view=poster]/grid:gap-x-8 group-data-[view=poster]/grid:gap-y-14 group-data-[view=poster]/grid:border-0 group-data-[view=poster]/grid:md:grid-cols-2 group-data-[view=poster]/grid:xl:grid-cols-3">
              {items.map((j) => <JobCard key={j.id} job={j} catalog={catalog} />)}
            </div>
          )}
        </ViewToggle>
        {f.page <= pageCount && <Pagination filters={f} pageCount={pageCount} />}
      </JobsResults>
    </JobsNav>
  );
}
