import Link from "next/link";
import JobCard from "@/components/JobCard";
import { countOpenJobsByGroup, getCatalog, getSiteSettings, listUpcomingInterviews, searchJobs } from "@/lib/data";
import { jobHref, parseFilters } from "@/lib/filters";
import { formatJst } from "@/lib/time";

export const dynamic = "force-dynamic"; // lịch phỏng vấn phụ thuộc thời điểm hiện tại

const STEPS = ["Tìm việc", "Gửi hồ sơ", "Tư vấn", "Phỏng vấn"];
const FAQ: [string, string][] = [
  ["Tôi cần chuẩn bị gì để gửi hồ sơ?", "Thông thường cần thông tin liên hệ và kinh nghiệm làm việc. Yêu cầu cụ thể tùy từng tin; vui lòng xem chi tiết tin hoặc liên hệ để được giải thích."],
  ["Có mất phí không?", "Vui lòng liên hệ để được giải thích cụ thể về chi phí."],
  ["Sau khi gửi hồ sơ thì làm gì tiếp?", "Bên tư vấn sẽ liên hệ để trao đổi thêm. Thời gian và kết quả phụ thuộc từng trường hợp; vui lòng liên hệ để được giải thích cụ thể."],
  ["Phỏng vấn diễn ra như thế nào?", "Hình thức (online hoặc trực tiếp) và thời gian được ghi trong từng tin khi đã xác nhận. Vui lòng liên hệ để được giải thích cụ thể."],
  ["Tôi chưa giỏi tiếng Nhật có ứng tuyển được không?", "Yêu cầu tiếng Nhật khác nhau theo từng tin. Bạn có thể lọc theo trình độ tiếng Nhật ở trang việc làm hoặc liên hệ để được tư vấn."],
];
const h2 = "mb-3 text-xl font-bold text-navy";

export default async function Home() {
  const catalog = await getCatalog();
  const [{ items }, events, counts, s] = await Promise.all([
    searchJobs(parseFilters({}, catalog)),
    listUpcomingInterviews({ prefectures: [], occupations: [] }),
    countOpenJobsByGroup(),
    getSiteSettings(),
  ]);
  return (
    <div className="space-y-10">
      <section className="rounded-lg bg-navy p-6 text-white sm:p-10">
        <h1 className="text-3xl font-bold">Tìm việc và chuyển việc kỹ sư tại Nhật cho người Việt</h1>
        <form action="/viec-lam" method="get" className="mt-5 flex flex-wrap items-end gap-2">
          <label className="min-w-0 flex-1 basis-56 text-sm font-semibold">Từ khóa
            <input name="q" type="search" placeholder="Mã tin, chức danh, kỹ năng…" className="mt-1 min-h-11 w-full rounded bg-white px-3 font-normal text-slate-900" />
          </label>
          <label className="min-w-0 flex-1 basis-56 text-sm font-semibold">Nhóm nghề
            <select name="nhom" defaultValue="" className="mt-1 min-h-11 w-full rounded bg-white px-2 font-normal text-slate-900">
              <option value="">Tất cả nhóm nghề</option>
              {catalog.groups.map((g) => <option key={g.slug} value={g.slug}>{g.nameVi}</option>)}
            </select>
          </label>
          <button className="min-h-11 rounded bg-brand px-6 font-semibold text-white focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white">Tìm việc</button>
        </form>
      </section>

      <section aria-labelledby="nhom">
        <h2 id="nhom" className={h2}>Nhóm nghề</h2>
        <ul className="grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
          {catalog.groups.map((g) => (
            <li key={g.slug}>
              <Link href={`/viec-lam?nhom=${g.slug}`} className="block h-full rounded-lg border border-slate-200 bg-white p-4 hover:border-brand focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#176AC0]">
                <span className="block font-bold text-navy">{g.nameVi}</span>
                <span lang="ja" className="block text-sm text-slate-600">{g.nameJa}</span>
                <span className="mt-2 block text-sm font-semibold text-brand">{counts[g.slug] ?? 0} việc làm</span>
              </Link>
            </li>
          ))}
        </ul>
      </section>

      <section aria-labelledby="moi">
        <h2 id="moi" className={h2}>Việc làm mới nhất</h2>
        <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-3">
          {items.slice(0, 6).map((j) => <JobCard key={j.id} job={j} catalog={catalog} />)}
        </div>
        <Link href="/viec-lam" className="mt-4 inline-flex min-h-11 items-center font-semibold text-brand underline">Xem tất cả việc làm</Link>
      </section>

      <section aria-labelledby="pv">
        <h2 id="pv" className={h2}>Lịch phỏng vấn sắp tới</h2>
        {events.length === 0 ? <p>Chưa có lịch phỏng vấn.</p> : (
          <ul className="space-y-2">
            {events.slice(0, 5).map((e) => (
              <li key={e.id} className="rounded border border-warn/40 bg-orange-50 p-3">
                <p className="font-semibold text-warn">{formatJst(e.startsAt)}</p>
                <Link href={jobHref(e.job)} className="font-semibold text-brand underline">{e.job.titleVi}</Link>
              </li>
            ))}
          </ul>
        )}
        <Link href="/lich-phong-van" className="mt-3 inline-flex min-h-11 items-center font-semibold text-brand underline">Xem toàn bộ lịch</Link>
      </section>

      <section aria-labelledby="qt">
        <h2 id="qt" className={h2}>Quy trình</h2>
        <ol className="grid gap-3 sm:grid-cols-4">
          {STEPS.map((t, i) => (
            <li key={t} className="rounded-lg border border-slate-200 bg-white p-4 font-semibold text-navy">
              <span className="mr-2 inline-flex size-7 items-center justify-center rounded-full bg-brand text-white">{i + 1}</span>{t}
            </li>
          ))}
        </ol>
      </section>

      <section aria-labelledby="gt" className="max-w-3xl">
        <h2 id="gt" className={h2}>Giới thiệu</h2>
        <p>{s.brandName} giúp kỹ sư người Việt tìm hiểu tin tuyển dụng tại Nhật Bản và được tư vấn trước khi ứng tuyển.</p>
        <Link href="/gioi-thieu" className="mt-2 inline-flex min-h-11 items-center font-semibold text-brand underline">Tìm hiểu thêm</Link>
      </section>

      <section aria-labelledby="faq" className="max-w-3xl">
        <h2 id="faq" className={h2}>Câu hỏi thường gặp</h2>
        <div className="space-y-2">
          {FAQ.map(([q, a]) => (
            <details key={q} className="rounded border border-slate-300 bg-white">
              <summary className="flex min-h-11 cursor-pointer items-center px-3 font-semibold text-navy">{q}</summary>
              <p className="px-3 pb-3">{a}</p>
            </details>
          ))}
        </div>
      </section>
    </div>
  );
}
