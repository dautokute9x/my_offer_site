import Link from "next/link";
import { countOpenJobsByGroup, getCatalog, getSiteSettings, listUpcomingInterviews, searchJobs } from "@/lib/data";
import { jobHref, parseFilters } from "@/lib/filters";
import { salaryLines, UNCONFIRMED } from "@/lib/salary";
import { formatJst } from "@/lib/time";
import { isPlaceholder } from "@/lib/site-defaults";

export const metadata = { alternates: { canonical: "/" } };

export const dynamic = "force-dynamic"; // lịch phỏng vấn phụ thuộc thời điểm hiện tại

const STEPS: [string, string][] = [
  ["Tìm việc", "Lọc theo tỉnh, nghề, lương và trình độ tiếng Nhật."],
  ["Gửi hồ sơ", "Điền thông tin và đính kèm CV ngay trong tin."],
  ["Tư vấn", "Bên tư vấn liên hệ để trao đổi thêm."],
  ["Phỏng vấn", "Lịch ghi theo giờ Nhật, có thể xem giờ Việt Nam."],
];
const FAQ: [string, string][] = [
  ["Tôi cần chuẩn bị gì để gửi hồ sơ?", "Thông thường cần thông tin liên hệ và kinh nghiệm làm việc. Yêu cầu cụ thể tùy từng tin; vui lòng xem chi tiết tin hoặc liên hệ để được giải thích."],
  ["Có mất phí không?", "Vui lòng liên hệ để được giải thích cụ thể về chi phí."],
  ["Sau khi gửi hồ sơ thì làm gì tiếp?", "Bên tư vấn sẽ liên hệ để trao đổi thêm. Thời gian và kết quả phụ thuộc từng trường hợp; vui lòng liên hệ để được giải thích cụ thể."],
  ["Phỏng vấn diễn ra như thế nào?", "Hình thức (online hoặc trực tiếp) và thời gian được ghi trong từng tin khi đã xác nhận. Vui lòng liên hệ để được giải thích cụ thể."],
  ["Tôi chưa giỏi tiếng Nhật có ứng tuyển được không?", "Yêu cầu tiếng Nhật khác nhau theo từng tin. Bạn có thể lọc theo trình độ tiếng Nhật ở trang việc làm hoặc liên hệ để được tư vấn."],
];
const head = "grid gap-6 lg:grid-cols-12 lg:gap-8";

export default async function Home() {
  const catalog = await getCatalog();
  const [{ items }, events, counts, s] = await Promise.all([
    searchJobs(parseFilters({}, catalog)),
    listUpcomingInterviews({ prefectures: [], occupations: [] }),
    countOpenJobsByGroup(),
    getSiteSettings(),
  ]);
  const place = (ids: number[]) => catalog.prefectures.filter((p) => ids.includes(p.id)).map((p) => p.nameVi).join(", ") || UNCONFIRMED;
  return (
    <div className="space-y-[var(--section-gap-s)]">
      {/* Hero kiểu Index: chính danh sách tin là hình ảnh của trang. */}
      <section aria-labelledby="hero" className="grid gap-12 lg:min-h-[calc(100dvh-12rem)] lg:grid-cols-12 lg:items-center lg:gap-8">
        <div className="lg:col-span-5">
          <h1 id="hero" className="text-[length:var(--text-display)]">Việc làm kỹ sư tại Nhật Bản</h1>
          <p className="standfirst mt-6">Tin tuyển dụng cho kỹ sư người Việt, kèm lương, yêu cầu tiếng Nhật và lịch phỏng vấn theo giờ Nhật.</p>
          <form action="/viec-lam" method="get" className="mt-8 grid gap-3 sm:grid-cols-[minmax(0,1fr)_auto]">
            <label className="text-sm text-ink sm:col-span-2">Từ khóa
              <input name="q" type="search" placeholder="Mã tin, chức danh, kỹ năng…" className="field mt-1" />
            </label>
            <label className="text-sm text-ink">Nhóm nghề
              <select name="nhom" defaultValue="" className="field mt-1">
                <option value="">Tất cả nhóm nghề</option>
                {catalog.groups.map((g) => <option key={g.slug} value={g.slug}>{g.nameVi}</option>)}
              </select>
            </label>
            <button className="btn btn-primary self-end">Tìm việc</button>
          </form>
        </div>
        <div className="lg:col-span-6 lg:col-start-7">
          <div className="flex items-baseline justify-between gap-4 border-t-4 border-ink pt-3">
            <h2 id="moi" className="text-[length:var(--text-title)]">Việc làm mới nhất</h2>
            <Link href="/viec-lam" className="link text-sm">Xem tất cả việc làm</Link>
          </div>
          <ol className="mt-2">
            {items.slice(0, 6).map((j) => {
              const { monthly, annual } = salaryLines(j);
              return (
                <li key={j.id} className="group relative grid grid-cols-[5.5rem_minmax(0,1fr)] gap-x-4 border-b border-rule py-4 transition-colors duration-200 hover:bg-paper-2">
                  <span className="display-face text-xl leading-tight">#{j.code}</span>
                  <div className="min-w-0">
                    <h3 className="text-[length:var(--text-title)] leading-tight">
                      <Link href={jobHref(j)} className="link decoration-transparent after:absolute after:inset-0 group-hover:decoration-accent">{j.titleVi}</Link>
                    </h3>
                    <p className="mt-1 text-sm text-muted">{place(j.prefectureIds)}</p>
                    <p className="text-sm text-ink tabular-nums">{monthly || annual || `Lương ${UNCONFIRMED.toLowerCase()}`}</p>
                  </div>
                </li>
              );
            })}
          </ol>
        </div>
      </section>

      <section aria-labelledby="nhom" className={head}>
        <div className="opens lg:col-span-4">
          <h2 id="nhom">Nhóm nghề</h2>
        </div>
        <ul className="border-t-4 border-ink lg:col-span-8">
          {catalog.groups.map((g) => (
            <li key={g.slug}>
              <Link href={`/viec-lam?nhom=${g.slug}`} className="group grid min-h-20 grid-cols-[minmax(0,1fr)_auto] items-center gap-x-6 border-b border-rule py-4 no-underline transition-colors duration-200 hover:bg-paper-2">
                <span>
                  <span className="display-face block text-[length:var(--text-title)] leading-tight underline decoration-transparent underline-offset-4 transition-colors duration-200 group-hover:decoration-accent">{g.nameVi}</span>
                  <span lang="ja" className="mt-1 block text-sm text-muted">{g.nameJa}</span>
                </span>
                <span className="display-face text-[length:var(--text-title)] tabular-nums">{counts[g.slug] ?? 0} việc làm</span>
              </Link>
            </li>
          ))}
        </ul>
      </section>

      <section aria-labelledby="pv" className={head}>
        <div className="opens lg:col-span-4">
          <h2 id="pv">Lịch phỏng vấn sắp tới</h2>
          <Link href="/lich-phong-van" className="link mt-4 inline-flex min-h-11 items-center">Xem toàn bộ lịch</Link>
        </div>
        {events.length === 0 ? <p className="prose-body lg:col-span-8 lg:border-t-4 lg:border-ink lg:pt-4">Chưa có lịch phỏng vấn.</p> : (
          <ul className="border-t-4 border-ink lg:col-span-8">
            {events.slice(0, 5).map((e) => (
              <li key={e.id} className="grid gap-x-6 gap-y-1 border-b border-rule py-4 sm:grid-cols-[minmax(0,15rem)_minmax(0,1fr)]">
                <p className="font-semibold text-accent">{formatJst(e.startsAt)}</p>
                <Link href={jobHref(e.job)} className="link font-semibold text-ink">{e.job.titleVi}</Link>
              </li>
            ))}
          </ul>
        )}
      </section>

      <section aria-labelledby="qt">
        <h2 id="qt" className="opens">Quy trình</h2>
        <ol className="mt-12 grid gap-10 sm:grid-cols-2 lg:grid-cols-4 lg:gap-8">
          {STEPS.map(([t, d], i) => (
            <li key={t} className="border-t border-rule-2 pt-4">
              <span className="display-face block text-[length:var(--text-display-s)] leading-none tabular-nums">{i + 1}</span>
              <span className="display-face mt-6 block text-[length:var(--text-title)] leading-tight">{t}</span>
              <span className="prose-body mt-2 block">{d}</span>
            </li>
          ))}
        </ol>
      </section>

      <section aria-labelledby="gt" className={head}>
        <div className="opens lg:col-span-4">
          <h2 id="gt">Giới thiệu</h2>
        </div>
        <div className="lg:col-span-8 lg:border-t-4 lg:border-ink lg:pt-4">
          <p className="standfirst max-w-[34ch] text-[length:var(--text-display-s)] leading-[1.15]">{isPlaceholder(s.aboutText) ? `${s.brandName} giúp kỹ sư người Việt tìm hiểu tin tuyển dụng tại Nhật Bản và được tư vấn trước khi ứng tuyển.` : s.aboutText.split(/\n\s*\n/)[0]}</p>
          <Link href="/gioi-thieu" className="btn mt-8">Tìm hiểu thêm</Link>
        </div>
      </section>

      <section aria-labelledby="faq" className={head}>
        <div className="opens lg:col-span-4">
          <h2 id="faq">Câu hỏi thường gặp</h2>
        </div>
        <div className="border-t-4 border-ink lg:col-span-8">
          {FAQ.map(([q, a]) => (
            <details key={q} className="group border-b border-rule">
              <summary className="flex min-h-16 cursor-pointer list-none items-center justify-between gap-6 py-4 display-face text-[length:var(--text-title)] leading-tight">
                {q}
                <span aria-hidden="true" className="text-muted transition-transform duration-200 group-open:rotate-45">+</span>
              </summary>
              <p className="prose-body pb-6">{a}</p>
            </details>
          ))}
        </div>
      </section>
    </div>
  );
}
