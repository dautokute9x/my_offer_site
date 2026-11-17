import Image from "next/image";
import Link from "next/link";
import { countOpenJobsByGroup, getCatalog, getSiteSettings, listUpcomingInterviews, searchJobs } from "@/lib/data";
import { jobHref, parseFilters } from "@/lib/filters";
import { PHOTOS, type Photo } from "@/lib/photos";
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
// Ảnh minh họa cho từng nhóm nghề (chỉ nhóm có ảnh phù hợp); nhóm khác là ô màu.
const GROUP_PHOTO: Record<string, Photo> = { dien: PHOTOS["bo-mach"], "xay-dung": PHOTOS["may-xuc"] };
const JAPAN: [Photo, string][] = [
  [PHOTOS.tokyo, "Đại lộ Omotesando, Tokyo"],
  [PHOTOS.kyoto, "Sân chùa ở Kyoto"],
  [PHOTOS["bao-go"], "Bào gỗ kanna của thợ mộc Nhật"],
];
const split = "grid gap-8 lg:grid-cols-12 lg:gap-8";

function Print({ photo, className = "", sizes, priority }: { photo: Photo; className?: string; sizes: string; priority?: boolean }) {
  return (
    <div data-slot className={`photo overflow-hidden ${className}`}>
      <Image src={photo.src} alt={photo.alt} width={photo.w} height={photo.h} sizes={sizes} priority={priority} />
    </div>
  );
}

export default async function Home() {
  const catalog = await getCatalog();
  const [{ items, total }, events, counts, s] = await Promise.all([
    searchJobs(parseFilters({}, catalog)),
    listUpcomingInterviews({ prefectures: [], occupations: [] }),
    countOpenJobsByGroup(),
    getSiteSettings(),
  ]);
  const place = (ids: number[]) => catalog.prefectures.filter((p) => ids.includes(p.id)).map((p) => p.nameVi).join(", ") || UNCONFIRMED;
  const words = catalog.occupations.map((o) => o.nameVi);
  return (
    <div className="space-y-[var(--section-gap-s)]">
      {/* Hero kiểu Stage: chữ bên trái, một bản in nghiêng của công việc bên phải, số tin đang tuyển đóng dấu ở góc. */}
      <section aria-labelledby="hero" className="grid items-center gap-14 lg:min-h-[calc(100dvh-11rem)] lg:grid-cols-12 lg:gap-8">
        <div className="lg:col-span-6">
          <h1 id="hero" className="max-w-[12ch] text-[clamp(3.25rem,6.5vw+0.5rem,7rem)] leading-[0.92]">Việc làm kỹ sư tại Nhật Bản.</h1>
          <p className="standfirst mt-6">Tin tuyển dụng cho kỹ sư người Việt, kèm lương, yêu cầu tiếng Nhật và lịch phỏng vấn theo giờ Nhật.</p>
          <form action="/viec-lam" method="get" className="mt-8 grid max-w-xl gap-3 sm:grid-cols-[minmax(0,1fr)_auto]">
            <label className="text-sm font-medium text-ink sm:col-span-2">Từ khóa
              <input name="q" type="search" placeholder="Mã tin, chức danh, kỹ năng…" className="field mt-1" />
            </label>
            <label className="text-sm font-medium text-ink">Nhóm nghề
              <select name="nhom" defaultValue="" className="field mt-1">
                <option value="">Tất cả nhóm nghề</option>
                {catalog.groups.map((g) => <option key={g.slug} value={g.slug}>{g.nameVi}</option>)}
              </select>
            </label>
            <button className="btn btn-primary self-end">Tìm việc</button>
          </form>
        </div>
        <div className="relative pb-10 lg:col-span-6 lg:pl-6">
          <Print photo={PHOTOS["cop-pha"]} className="tilt-r aspect-[4/3]" sizes="(min-width: 1024px) 45vw, 100vw" priority />
          <Link href="/viec-lam" className="well band-a absolute bottom-0 left-0 block px-5 py-3 no-underline transition-colors duration-150 hover:bg-paper-2 lg:left-0">
            <span className="display-face block text-[clamp(2.5rem,4vw,3.75rem)] leading-none">{total}</span>
            <span className="block text-sm font-medium">việc làm đang tuyển</span>
          </Link>
        </div>
      </section>

      {/* Dải chữ chạy: tên các nghề trong danh mục (dừng khi rê chuột, tắt khi người dùng giảm chuyển động). */}
      <div className="marquee-track -mx-[var(--gutter)] overflow-hidden border-y-2 border-ink bg-paper-2 py-4" aria-label="Các nghề đang tuyển">
        <div className="marquee">
          {[0, 1].map((k) => (
            <ul key={k} aria-hidden={k === 1 || undefined} className="flex shrink-0 gap-[var(--space-2xl)]">
              {words.map((w) => <li key={w} className="display-face whitespace-nowrap text-3xl">{w}</li>)}
            </ul>
          ))}
        </div>
      </div>

      <section aria-labelledby="moi" className={split}>
        <div className="lg:col-span-4">
          <h2 id="moi" className="text-[length:var(--text-display-s)]">Việc làm mới nhất</h2>
          <Link href="/viec-lam" className="btn mt-8">Xem tất cả việc làm</Link>
        </div>
        <ol className="border-t-2 border-accent-2 lg:col-span-8">
          {items.slice(0, 6).map((j) => {
            const { monthly, annual } = salaryLines(j);
            return (
              <li key={j.id} className="group relative grid grid-cols-[6rem_minmax(0,1fr)] gap-x-5 gap-y-1 border-b-2 border-accent-2/30 py-5 transition-colors duration-150 hover:bg-paper-2 sm:grid-cols-[6rem_minmax(0,1fr)_minmax(0,13rem)]">
                <span className="display-face text-2xl leading-tight">#{j.code}</span>
                <div className="min-w-0">
                  <h3 className="text-[length:var(--text-title)] leading-tight">
                    <Link href={jobHref(j)} className="link decoration-transparent after:absolute after:inset-0 group-hover:decoration-accent-2">{j.titleVi}</Link>
                  </h3>
                  <p className="mt-1 text-sm text-muted">{place(j.prefectureIds)}</p>
                </div>
                <p className="col-start-2 text-sm font-medium tabular-nums sm:col-start-3">{monthly || annual || `Lương ${UNCONFIRMED.toLowerCase()}`}</p>
              </li>
            );
          })}
        </ol>
      </section>

      {/* Số liệu thật lấy từ dữ liệu đang có; họa tiết chấm ở một góc, không nằm dưới chữ. */}
      <section aria-labelledby="so-lieu" className="band-a relative -mx-[var(--gutter)] overflow-hidden px-[var(--gutter)] py-[var(--section-gap-s)]">
        <div aria-hidden="true" className="halftone absolute right-0 top-0 h-56 w-72 opacity-60 [mask-image:linear-gradient(to_bottom_left,black,transparent_75%)]" />
        <div className="relative mx-auto max-w-[calc(var(--container)-2*var(--gutter))]">
          <h2 id="so-lieu" className="text-[length:var(--text-display-s)]">Đang tuyển.</h2>
          <dl className="mt-12 grid gap-8 border-t-2 border-ink pt-8 sm:grid-cols-3 sm:gap-0">
            {([[total, "việc làm đang mở"], [catalog.groups.length, "nhóm nghề"], [events.length, "lịch phỏng vấn sắp tới"]] as const).map(([n, label], i) => (
              <div key={label} className={`flex flex-col-reverse ${i > 0 ? "sm:border-l-2 sm:border-ink sm:pl-8" : ""}`}>
                <dt className="mt-2 text-base font-medium">{label}</dt>
                <dd className="display-face text-[clamp(4rem,9vw,8.5rem)] leading-[0.85]">{n}</dd>
              </div>
            ))}
          </dl>
        </div>
      </section>

      <section aria-labelledby="nhom">
        <h2 id="nhom" className="text-[length:var(--text-display-s)]">Nhóm nghề</h2>
        <ul className="mt-12 grid gap-8 md:grid-cols-6 lg:grid-cols-12">
          {catalog.groups.map((g, i) => {
            const photo = GROUP_PHOTO[g.slug];
            const span = i === 0 ? "md:col-span-6 lg:col-span-7" : i === 1 ? "md:col-span-6 lg:col-span-5" : "md:col-span-2 lg:col-span-4";
            return (
              <li key={g.slug} className={span}>
                <Link href={`/viec-lam?nhom=${g.slug}`} className="group flex h-full flex-col gap-4 no-underline">
                  {photo ? (
                    <Print photo={photo} className={`aspect-[16/10] ${i % 2 ? "tilt-r" : "tilt-l"}`} sizes="(min-width: 1024px) 50vw, 100vw" />
                  ) : (
                    <span aria-hidden="true" className={`well block p-6 ${i % 2 ? "" : "bg-paper-3"}`}>
                      <span className="display-face block text-[clamp(4rem,7vw,6rem)] leading-[0.85]">{counts[g.slug] ?? 0}</span>
                    </span>
                  )}
                  <span className="flex items-baseline justify-between gap-4">
                    <span>
                      <span className="display-face block text-[length:var(--text-title)] leading-tight underline decoration-transparent decoration-2 underline-offset-4 transition-colors duration-150 group-hover:decoration-accent-2">{g.nameVi}</span>
                      <span lang="ja" className="mt-1 block text-sm text-muted">{g.nameJa}</span>
                    </span>
                    <span className="display-face whitespace-nowrap text-[length:var(--text-title)] tabular-nums">{counts[g.slug] ?? 0} việc làm</span>
                  </span>
                </Link>
              </li>
            );
          })}
        </ul>
      </section>

      <section aria-labelledby="nhat-ban" className={split}>
        <div className="lg:col-span-3">
          <h2 id="nhat-ban" className="text-[length:var(--text-display-s)]">Nhật Bản.</h2>
          <p className="standfirst mt-6">Nơi các tin tuyển dụng trên trang đang chờ bạn.</p>
        </div>
        <ul className="grid gap-10 sm:grid-cols-3 sm:gap-6 lg:col-span-9">
          {JAPAN.map(([photo, caption], i) => (
            <li key={photo.src}>
              <figure>
                <Print photo={photo} className={`aspect-[4/5] ${i === 1 ? "tilt-r sm:mt-12" : "tilt-l"}`} sizes="(min-width: 640px) 30vw, 100vw" />
                <figcaption className="mt-4 text-sm font-medium">{caption}</figcaption>
              </figure>
            </li>
          ))}
        </ul>
      </section>

      <section aria-labelledby="pv" className={split}>
        <div className="lg:col-span-4">
          <h2 id="pv" className="text-[length:var(--text-display-s)]">Lịch phỏng vấn sắp tới</h2>
          <Link href="/lich-phong-van" className="btn mt-8">Xem toàn bộ lịch</Link>
        </div>
        {events.length === 0 ? <p className="prose-body lg:col-span-8 lg:border-t-2 lg:border-accent-2 lg:pt-4">Chưa có lịch phỏng vấn.</p> : (
          <ul className="border-t-2 border-accent-2 lg:col-span-8">
            {events.slice(0, 5).map((e) => (
              <li key={e.id} className="grid gap-x-6 gap-y-1 border-b-2 border-accent-2/30 py-4 sm:grid-cols-[minmax(0,16rem)_minmax(0,1fr)]">
                <p className="font-bold text-accent-2">{formatJst(e.startsAt)}</p>
                <Link href={jobHref(e.job)} className="link font-medium text-ink">{e.job.titleVi}</Link>
              </li>
            ))}
          </ul>
        )}
      </section>

      <section aria-labelledby="qt">
        <h2 id="qt" className="text-[length:var(--text-display-s)]">Quy trình</h2>
        <ol className="mt-12 grid gap-8 sm:grid-cols-2 lg:grid-cols-4">
          {STEPS.map(([t, d], i) => (
            <li key={t} className={`well flex flex-col p-6 ${i % 2 ? "bg-paper-3" : ""}`}>
              <span className="display-face block text-[length:var(--text-display)] leading-none tabular-nums">{i + 1}</span>
              <span className="display-face mt-6 block text-[length:var(--text-title)] leading-tight">{t}</span>
              <span className="mt-2 block">{d}</span>
            </li>
          ))}
        </ol>
      </section>

      <section aria-labelledby="gt" className={`${split} items-center`}>
        <div className="lg:col-span-5">
          <Print photo={PHOTOS["trung-tam-du-lieu"]} className="tilt-l aspect-[3/2]" sizes="(min-width: 1024px) 40vw, 100vw" />
        </div>
        <div className="lg:col-span-6 lg:col-start-7">
          <h2 id="gt" className="text-[length:var(--text-display-s)]">Giới thiệu</h2>
          <p className="standfirst mt-6 max-w-[38ch] text-[length:var(--text-xl)] leading-snug">{isPlaceholder(s.aboutText) ? `${s.brandName} giúp kỹ sư người Việt tìm hiểu tin tuyển dụng tại Nhật Bản và được tư vấn trước khi ứng tuyển.` : s.aboutText.split(/\n\s*\n/)[0]}</p>
          <Link href="/gioi-thieu" className="btn mt-8">Tìm hiểu thêm</Link>
        </div>
      </section>

      <section aria-labelledby="faq" className={split}>
        <div className="lg:col-span-4">
          <h2 id="faq" className="text-[length:var(--text-display-s)]">Câu hỏi thường gặp</h2>
        </div>
        <div className="border-t-2 border-accent-2 lg:col-span-8">
          {FAQ.map(([q, a]) => (
            <details key={q} className="group border-b-2 border-accent-2/30">
              <summary className="flex min-h-16 cursor-pointer list-none items-center justify-between gap-6 py-4 text-lg font-bold text-ink">
                {q}
                <span aria-hidden="true" className="display-face text-3xl text-accent-2 transition-transform duration-150 group-open:rotate-45">+</span>
              </summary>
              <p className="prose-body pb-6">{a}</p>
            </details>
          ))}
        </div>
      </section>
    </div>
  );
}
