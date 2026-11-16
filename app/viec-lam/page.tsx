import type { Metadata } from "next";
import { getCatalog, searchJobs } from "@/lib/data";
import { filtersToQuery, hasActiveFilters, parseFilters } from "@/lib/filters";
import JobCard from "@/components/JobCard";
import Pagination from "@/components/Pagination";
import ViewToggle from "@/components/ViewToggle";
import ActiveChips from "@/components/filters/ActiveChips";
import FilterPanel from "@/components/filters/FilterPanel";

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
    <div className="lg:grid lg:grid-cols-[18rem_1fr] lg:gap-6">
      <aside className="mb-4 lg:sticky lg:top-4 lg:mb-0 lg:max-h-[calc(100vh-2rem)] lg:self-start lg:overflow-y-auto">
        <FilterPanel catalog={catalog} filters={f} total={total} />
      </aside>
      <section className="min-w-0 space-y-4">
        <h1 className="text-2xl font-bold text-navy">Việc làm kỹ sư tại Nhật</h1>
        <form action="/viec-lam" method="get" className="flex flex-wrap items-end gap-2">
          {/* Giữ các bộ lọc khác; đổi từ khóa hoặc sắp xếp thì về trang 1. */}
          {[...new URLSearchParams(filtersToQuery({ ...f, q: "", sort: "moi", page: 1 }))].map(([k, v]) => (
            <input key={k} type="hidden" name={k} value={v} />
          ))}
          <label className="min-w-0 flex-1 basis-56 text-sm font-semibold text-navy">Tìm kiếm
            <input name="q" type="search" defaultValue={f.q} placeholder="Mã tin, chức danh, kỹ năng…"
              className="mt-1 min-h-11 w-full rounded border border-slate-300 bg-white px-3 font-normal" />
          </label>
          <label className="text-sm font-semibold text-navy">Sắp xếp
            <select name="sx" defaultValue={f.sort} className="mt-1 min-h-11 w-full rounded border border-slate-300 bg-white px-2 font-normal">
              {sorts.map(([v, l]) => <option key={v} value={v}>{l}</option>)}
            </select>
          </label>
          <button className="min-h-11 rounded bg-brand px-5 font-semibold text-white">Tìm</button>
        </form>
        <ActiveChips filters={f} catalog={catalog} />
        <ViewToggle summary={<p role="status" className="font-semibold">Tìm thấy {total} việc làm</p>}>
          {items.length === 0 ? (
            <div className="rounded-lg border border-slate-200 bg-white p-6 text-center">
              <p className="font-semibold text-navy">Không tìm thấy việc làm phù hợp</p>
              <div className="mt-3 flex flex-wrap justify-center gap-2">
                {f.page > 1 && total > 0 && (
                  <a href={`/viec-lam${filtersToQuery({ ...f, page: 1 }) ? "?" + filtersToQuery({ ...f, page: 1 }) : ""}`}
                    className="inline-flex min-h-11 items-center rounded bg-brand px-5 font-semibold text-white">Về trang 1</a>
                )}
                {hasActiveFilters(f) && (
                  <a href="/viec-lam" className="inline-flex min-h-11 items-center rounded border border-brand px-5 font-semibold text-brand">Xóa bộ lọc</a>
                )}
              </div>
            </div>
          ) : (
            <div className="grid grid-cols-1 gap-4 md:grid-cols-2 group-data-[view=poster]/grid:lg:grid-cols-3">
              {items.map((j) => <JobCard key={j.id} job={j} catalog={catalog} />)}
            </div>
          )}
        </ViewToggle>
        {f.page <= pageCount && <Pagination filters={f} pageCount={pageCount} />}
      </section>
    </div>
  );
}
