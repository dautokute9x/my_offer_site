import type { Metadata } from "next";
import { getCatalog, searchJobs } from "@/lib/data";
import { hasActiveFilters, parseFilters } from "@/lib/filters";
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
          {/* Giữ các bộ lọc khác; đổi từ khóa hoặc sắp xếp thì về trang 1 (không gửi `trang`). */}
          {([["tinh", f.prefectures.join(",")], ["nhom", f.groups.join(",")], ["nghe", f.occupations.join(",")],
            ["luong", f.salaryMinMan != null || f.salaryMaxMan != null ? `${f.salaryMinMan ?? ""}-${f.salaryMaxMan ?? ""}` : ""],
            ["ky", f.period === "year" ? "nam" : ""], ["tiengnhat", f.jpLevel ?? ""], ["kn", f.maxExperience?.toString() ?? ""],
            ["ql", f.benefits.join(",")], ["pv", f.hasInterview ? "1" : ""]] as const)
            .filter(([, v]) => v)
            .map(([k, v]) => <input key={k} type="hidden" name={k} value={v} />)}
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
        <div className="flex flex-wrap items-center justify-between gap-2">
          <p role="status" className="font-semibold">Tìm thấy {total} việc làm</p>
          <ViewToggle targetId="job-grid" />
        </div>
        {items.length === 0 ? (
          <div className="rounded-lg border border-slate-200 bg-white p-6 text-center">
            <p className="font-semibold text-navy">Không tìm thấy việc làm phù hợp</p>
            <a href="/viec-lam" className="mt-3 inline-flex min-h-11 items-center rounded bg-brand px-5 font-semibold text-white">
              {f.page > 1 ? "Về trang 1 / xóa bộ lọc" : "Xóa bộ lọc"}
            </a>
          </div>
        ) : (
          <div id="job-grid" data-view="list"
            className="group/grid grid grid-cols-1 gap-4 md:grid-cols-2 data-[view=poster]:xl:grid-cols-3">
            {items.map((j) => <JobCard key={j.id} job={j} catalog={catalog} />)}
          </div>
        )}
        <Pagination filters={f} pageCount={pageCount} />
      </section>
    </div>
  );
}
